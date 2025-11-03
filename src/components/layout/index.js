import { LOGIN } from "lib/routes";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "hooks/auth";
import Navbar from "components/layout/Navbar";
import Sidebar from "components/layout/Sidebar";
import { Box, Flex, Center, Spinner, Heading } from "@chakra-ui/react";

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && pathname.startsWith("/protected") && !user) {
      navigate(LOGIN);
    }
  }, [pathname, user, isLoading]);

  if (isLoading)
    return (
      <Center>
        <Spinner color="teal.500" />
      </Center>
    );

  return (
    <Flex
      h={[null, null, "100vh"]}
      maxW="2000px"
      flexDir={["column", "column", "row"]}
      overflow="hidden"
    >
      <Sidebar />

      <Flex
        w={["100%", "100%", "100%", "100%", "100%"]}
        p="3%"
        flexDir="column"
        overflow="auto"
        minH="100vh"
      >
        {user && (
          <Heading fontWeight="normal" mb={4} letterSpacing="tight">
            Welcome back,{" "}
            <Flex display="inline-flex" fontWeight="bold">
              {user.role && user.company
                ? `${user.role} at ${user.company}`
                : user.firstName}
            </Flex>
          </Heading>
        )}

        <Outlet />
      </Flex>
    </Flex>
  );
}
