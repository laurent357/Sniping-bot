import asyncio
import json
import logging
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any, Union

logger = logging.getLogger(__name__)

class MessageType(Enum):
    TRANSACTION_REQUEST = "transaction_request"
    TRANSACTION_RESPONSE = "transaction_response"
    SECURITY_CHECK = "security_check"
    SECURITY_RESPONSE = "security_response"

@dataclass
class IPCMessage:
    type: MessageType
    data: Dict[str, Any]

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "data": self.data
        })

    @classmethod
    def from_json(cls, json_str: str) -> 'IPCMessage':
        data = json.loads(json_str)
        return cls(
            type=MessageType(data["type"]),
            data=data["data"]
        )

class IPCClient:
    def __init__(self, socket_path: Union[str, Path]):
        self.socket_path = Path(socket_path)
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None

    async def connect(self):
        try:
            self._reader, self._writer = await asyncio.open_unix_connection(
                str(self.socket_path)
            )
            logger.info(f"Connecté au serveur IPC sur {self.socket_path}")
        except Exception as e:
            logger.error(f"Erreur de connexion au serveur IPC: {e}")
            raise

    async def close(self):
        if self._writer:
            self._writer.close()
            await self._writer.wait_closed()
            logger.info("Connexion IPC fermée")

    async def send_message(self, message: IPCMessage) -> Optional[IPCMessage]:
        if not self._writer:
            await self.connect()

        try:
            data = message.to_json().encode()
            self._writer.write(data)
            await self._writer.drain()

            # Attend la réponse
            if self._reader:
                response_data = await self._reader.read()
                if response_data:
                    return IPCMessage.from_json(response_data.decode())
                
        except Exception as e:
            logger.error(f"Erreur d'envoi du message: {e}")
            raise
        return None

    async def request_transaction(
        self,
        instructions: bytes,
        priority: str = "MEDIUM",
        max_retries: int = 3
    ) -> Optional[str]:
        """Envoie une requête de transaction au serveur Rust."""
        message = IPCMessage(
            type=MessageType.TRANSACTION_REQUEST,
            data={
                "instructions": list(instructions),
                "priority": priority,
                "max_retries": max_retries
            }
        )

        response = await self.send_message(message)
        if response and response.type == MessageType.TRANSACTION_RESPONSE:
            return response.data.get("signature")
        return None

    async def check_security(self, token: str, amount: int) -> tuple[bool, Optional[str]]:
        """Vérifie la sécurité d'une transaction avec le serveur Rust."""
        message = IPCMessage(
            type=MessageType.SECURITY_CHECK,
            data={
                "token": token,
                "amount": amount
            }
        )

        response = await self.send_message(message)
        if response and response.type == MessageType.SECURITY_RESPONSE:
            return response.data.get("is_safe", False), response.data.get("reason")
        return False, "Pas de réponse du serveur de sécurité"

async def main():
    """Fonction de test."""
    client = IPCClient("/tmp/trading_bot.sock")
    
    try:
        # Test d'une requête de transaction
        signature = await client.request_transaction(
            instructions=b"test_instruction",
            priority="HIGH",
            max_retries=5
        )
        print(f"Signature reçue: {signature}")

        # Test d'une vérification de sécurité
        is_safe, reason = await client.check_security(
            token="SOL123",
            amount=1000000000
        )
        print(f"Sécurité: {is_safe}, Raison: {reason}")

    finally:
        await client.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main()) 