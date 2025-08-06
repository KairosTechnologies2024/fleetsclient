import { ChakraProvider } from "@chakra-ui/react";
import { routes } from "lib/routes";
import { RouterProvider } from "react-router-dom";
import './App.css'

function App() {
  return (
    <ChakraProvider>
      <RouterProvider router={routes} />
    </ChakraProvider>
  );
}

export default App;
