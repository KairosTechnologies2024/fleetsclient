import { auth } from "lib/firebase";
import { checkUserRole } from "Functions/CheckUserRole";
import { FLEET, MANAGER } from "lib/routes";

export async function handleLogin(data, login, navigate, toast) {
    try {
        // Attempt to log in the user
        await login({
            email: data.email,
            password: data.password,
            redirectTo: "",
        });

        const userId = auth.currentUser.uid;
        const { role, isAdmin } = await checkUserRole(userId);

        // Based on the role and isAdmin flag, determine the navigation path
        if (role === "fleetCustomers" && isAdmin) {
            localStorage.setItem("userRole", "fleetCustomer");
            navigate(MANAGER);
        } else if (role === "customers") {
            localStorage.setItem("userRole", "customer");
            navigate(FLEET);
        } else if (role === "fleetControllers") {
            localStorage.setItem("userRole", "fleetController");
            navigate(FLEET);
        }

    } catch (error) {
        console.error("Login Error:", error.message);

        // Check for incorrect login credentials
        if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
            toast({
                title: "Invalid login details",
                description: "Please check your email and password.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
            });
        } else {
            toast({
                title: "Please Check login details",
                // description: error.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
            });
        }
    }
}
