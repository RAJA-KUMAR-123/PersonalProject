import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import productsReducer, { productsFetch } from "./features/productsSlice";
import cartReducer, { getTotals } from "./features/cartSlice";
import { productsApi } from "./features/productsApi";
import AuthReducer, { loadUser } from "./features/AuthSlice";

const store = configureStore({
  reducer: {
    products: productsReducer,
    cart: cartReducer,
    auth:AuthReducer,
    [productsApi.reducerPath]: productsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productsApi.middleware),
});

store.dispatch(productsFetch());
store.dispatch(getTotals());
store.dispatch(loadUser(null));


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store = {store}>
    <App />
    </Provider>
  </React.StrictMode>
);


