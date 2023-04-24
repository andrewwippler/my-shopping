import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { AppState, AppThunk } from '@/store'
import { shoppingItems } from '@/types/ShoppingItem'

export interface UIState {
  shoppingItems: Array<shoppingItems>
  updateUI: boolean
}

const initialState: UIState = {
  shoppingItems: [{
    id: 0,
    name: "None",
    picked: false,
    person: "",
  }],
  updateUI: false,
}

export const uiReducer = createSlice({
  name: 'ui',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setShoppingItems: (state, actions) => {
      state.shoppingItems = actions.payload
    },
    setUpdateUI: (state) => {
      state.updateUI = !state.updateUI
    }
  },


})
export const selectshoppingItems = (state: AppState) => state.ui.shoppingItems
export const selectUpdateUI = (state: AppState) => state.ui.updateUI

export const { setShoppingItems, setUpdateUI } = uiReducer.actions

export default uiReducer.reducer
