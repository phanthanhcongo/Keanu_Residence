import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CurrencyProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CurrencyProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
