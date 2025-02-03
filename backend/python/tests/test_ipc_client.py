import pytest
import asyncio
import json
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from ipc_client import IPCClient, IPCMessage, MessageType
from ..utils.logging import BotLogger

@pytest.fixture
def socket_path(tmp_path):
    return tmp_path / "test.sock"

@pytest.fixture
def ipc_client(socket_path):
    return IPCClient(
        socket_path=socket_path,
        logger=Mock(spec=BotLogger),
        reconnect_interval=1.0,
        max_retries=3
    )

@pytest.mark.asyncio
async def test_message_serialization():
    """Test la sérialisation et désérialisation des messages."""
    message = IPCMessage(
        type=MessageType.TRANSACTION_REQUEST,
        data={
            "instructions": [1, 2, 3],
            "priority": "HIGH",
            "max_retries": 3
        }
    )

    json_str = message.to_json()
    assert isinstance(json_str, str)

    decoded = IPCMessage.from_json(json_str)
    assert decoded.type == MessageType.TRANSACTION_REQUEST
    assert decoded.data["instructions"] == [1, 2, 3]
    assert decoded.data["priority"] == "HIGH"
    assert decoded.data["max_retries"] == 3

@pytest.mark.asyncio
async def test_connect_and_close(ipc_client):
    """Test la connexion et déconnexion du client."""
    mock_reader = Mock()
    mock_writer = Mock()
    
    with patch("asyncio.open_unix_connection", 
              return_value=(mock_reader, mock_writer)):
        await ipc_client.connect()
        assert ipc_client._reader == mock_reader
        assert ipc_client._writer == mock_writer

        await ipc_client.close()
        assert mock_writer.close.called
        assert mock_writer.wait_closed.called

@pytest.mark.asyncio
async def test_request_transaction(ipc_client):
    """Test l'envoi d'une requête de transaction."""
    mock_reader = Mock()
    mock_writer = Mock()
    
    # Simule une réponse du serveur
    response = {
        "type": "transaction_response",
        "data": {
            "signature": "test_signature",
            "error": None
        }
    }
    mock_reader.read.return_value = json.dumps(response).encode()

    with patch("asyncio.open_unix_connection", 
              return_value=(mock_reader, mock_writer)):
        signature = await ipc_client.request_transaction(
            instructions=b"test",
            priority="HIGH",
            max_retries=3
        )
        
        assert signature == "test_signature"
        assert mock_writer.write.called
        assert mock_writer.drain.called

@pytest.mark.asyncio
async def test_check_security(ipc_client):
    """Test la vérification de sécurité."""
    mock_reader = Mock()
    mock_writer = Mock()
    
    # Simule une réponse du serveur
    response = {
        "type": "security_response",
        "data": {
            "is_safe": True,
            "reason": None
        }
    }
    mock_reader.read.return_value = json.dumps(response).encode()

    with patch("asyncio.open_unix_connection", 
              return_value=(mock_reader, mock_writer)):
        is_safe, reason = await ipc_client.check_security(
            token="TEST123",
            amount=1000000
        )
        
        assert is_safe is True
        assert reason is None
        assert mock_writer.write.called
        assert mock_writer.drain.called

@pytest.mark.asyncio
async def test_error_handling(ipc_client):
    """Test la gestion des erreurs."""
    with patch("asyncio.open_unix_connection", 
              side_effect=ConnectionError("Test error")):
        with pytest.raises(ConnectionError):
            await ipc_client.connect()

@pytest.mark.asyncio
async def test_message_timeout(ipc_client):
    """Test le timeout des messages."""
    mock_reader = Mock()
    mock_writer = Mock()
    
    # Simule un timeout en retournant None
    mock_reader.read.return_value = None

    with patch("asyncio.open_unix_connection", 
              return_value=(mock_reader, mock_writer)):
        response = await ipc_client.send_message(
            IPCMessage(
                type=MessageType.TRANSACTION_REQUEST,
                data={"test": "data"}
            )
        )
        
        assert response is None

@pytest.mark.asyncio
async def test_init_ipc_client(ipc_client):
    assert ipc_client.socket_path == socket_path(tmp_path())
    assert ipc_client.reconnect_interval == 1.0
    assert ipc_client.max_retries == 3
    assert not ipc_client.is_connected

@pytest.mark.asyncio
async def test_connect_success():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(socket_path(tmp_path()))
        await client.connect()
        
        assert client.is_connected
        assert client._writer == mock_writer
        assert client._reader == mock_reader

@pytest.mark.asyncio
async def test_connect_failure():
    with patch("asyncio.open_unix_connection", side_effect=ConnectionRefusedError):
        client = IPCClient(
            socket_path(tmp_path()),
            logger=Mock(spec=BotLogger),
            max_retries=1
        )
        
        await client.connect()
        assert not client.is_connected
        client.logger.error.assert_called()

@pytest.mark.asyncio
async def test_send_message():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(socket_path(tmp_path()))
        await client.connect()
        
        message = {
            "type": "execute_trade",
            "data": {
                "token_address": "abc123",
                "amount": 1000
            }
        }
        
        await client.send_message(message)
        
        # Vérifie que le message a été encodé et envoyé correctement
        expected_data = (json.dumps(message) + "\n").encode()
        mock_writer.write.assert_called_with(expected_data)
        mock_writer.drain.assert_called_once()

@pytest.mark.asyncio
async def test_receive_message():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    response_data = {
        "type": "trade_result",
        "data": {
            "success": True,
            "transaction_hash": "xyz789"
        }
    }
    
    mock_reader.readline.return_value = (json.dumps(response_data) + "\n").encode()
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(socket_path(tmp_path()))
        await client.connect()
        
        message = await client.receive_message()
        assert message == response_data

@pytest.mark.asyncio
async def test_receive_message_invalid_json():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    mock_reader.readline.return_value = b"invalid json\n"
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(
            socket_path(tmp_path()),
            logger=Mock(spec=BotLogger)
        )
        await client.connect()
        
        message = await client.receive_message()
        assert message is None
        client.logger.error.assert_called_once()

@pytest.mark.asyncio
async def test_reconnection():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    connection_attempts = 0
    
    async def mock_connect(*args, **kwargs):
        nonlocal connection_attempts
        connection_attempts += 1
        if connection_attempts < 2:
            raise ConnectionRefusedError()
        return mock_reader, mock_writer
    
    with patch("asyncio.open_unix_connection", side_effect=mock_connect):
        client = IPCClient(
            socket_path(tmp_path()),
            reconnect_interval=0.1,
            max_retries=3
        )
        
        await client.connect()
        assert client.is_connected
        assert connection_attempts == 2

@pytest.mark.asyncio
async def test_message_timeout():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    # Simule un timeout en faisant que readline prend trop de temps
    async def slow_readline():
        await asyncio.sleep(2)
        return b""
    
    mock_reader.readline.side_effect = slow_readline
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(
            socket_path(tmp_path()),
            logger=Mock(spec=BotLogger)
        )
        await client.connect()
        
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(client.receive_message(), timeout=1.0)

@pytest.mark.asyncio
async def test_graceful_shutdown():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(socket_path(tmp_path()))
        await client.connect()
        
        await client.disconnect()
        
        assert not client.is_connected
        mock_writer.close.assert_called_once()
        mock_writer.wait_closed.assert_called_once()

@pytest.mark.asyncio
async def test_message_queue():
    mock_reader = AsyncMock()
    mock_writer = AsyncMock()
    
    with patch("asyncio.open_unix_connection", return_value=(mock_reader, mock_writer)):
        client = IPCClient(socket_path(tmp_path()))
        await client.connect()
        
        # Envoie plusieurs messages rapidement
        messages = [
            {"type": "msg1", "data": "test1"},
            {"type": "msg2", "data": "test2"},
            {"type": "msg3", "data": "test3"}
        ]
        
        for msg in messages:
            await client.send_message(msg)
        
        # Vérifie que tous les messages ont été envoyés dans l'ordre
        expected_calls = [
            ((json.dumps(msg) + "\n").encode(),)
            for msg in messages
        ]
        
        assert mock_writer.write.call_args_list == expected_calls
        assert mock_writer.drain.call_count == len(messages) 