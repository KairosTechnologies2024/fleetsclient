import { ChakraProvider } from "@chakra-ui/react";
import { routes } from "lib/routes";
import { RouterProvider } from "react-router-dom";
import './App.css'
import { AlertsProvider } from "store/AlertsContext";
import { AppContext } from "store/AppContext";

function App() {
  return (
    <ChakraProvider>
      <AlertsProvider>
        <AppContext>
      <RouterProvider router={routes} />
        </AppContext>
      </AlertsProvider>
    
    </ChakraProvider>
  );
}

export default App;
