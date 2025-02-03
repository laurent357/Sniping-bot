import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Settings {
  maxSlippage: number;
  gasLimit: number;
  autoTrade: boolean;
  minLiquidity: number;
  maxSpread: number;
  theme: 'light' | 'dark';
}

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: {
    maxSlippage: 1.0,
    gasLimit: 300000,
    autoTrade: false,
    minLiquidity: 1000,
    maxSpread: 3.0,
    theme: 'dark',
  },
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings(state, action: PayloadAction<Partial<Settings>>) {
      state.settings = { ...state.settings, ...action.payload };
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { updateSettings, setLoading, setError } = settingsSlice.actions;
export default settingsSlice.reducer;
