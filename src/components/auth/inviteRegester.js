import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { Box, Button, Center, FormControl, FormLabel, Heading, Input, VStack, FormErrorMessage } from "@chakra-ui/react";
import { addDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "lib/firebase";
import { DASHBOARD } from "lib/routes";

const Register = () => {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();

    const handleRegister = async (data) => {
        if (data.password !== data.confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match!",
                status: "error",
                isClosable: true,
                position: "top",
                duration: 5000,
            });
            return;
        }

        setIsLoading(true);

        try {
            // Check if the email exists
            const userQuerySnapshot = await getDocs(
                query(collection(db, "fleetControllers"), where("email", "==", data.email))
            );

            if (!userQuerySnapshot.empty) {
                const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                const user = userCredential.user;

                const userDoc = userQuerySnapshot.docs[0];

                

                // Update fleetControllers
                await updateDoc(userDoc.ref, {
                    status: "active",
                    userId: user.uid,
                    name: data.name,
                });

                toast({
                    title: "Success",
                    description: "Account activated successfully!",
                    status: "success",
                    isClosable: true,
                    position: "top",
                    duration: 5000,
                });

                navigate(DASHBOARD);
            } else {
                toast({
                    title: "Registration Denied",
                    description: "This email is not authorized to register.",
                    status: "error",
                    isClosable: true,
                    position: "top",
                    duration: 5000,
                });
            }
        } catch (error) {
            toast({
                title: "Registration Failed",
                description: error.message,
                status: "error",
                isClosable: true,
                position: "top",
                duration: 5000,
            });
        }

        setIsLoading(false);
    };


    return (
        <Center minH="100vh">
            <Box p={6} boxShadow="md" borderRadius="lg" bg="white" maxW="400px" w="full">
                <Heading size="lg" textAlign="center" mb={4}>
                    Invite Registration
                </Heading>

                <form onSubmit={handleSubmit(handleRegister)}>
                    <VStack spacing={4}>
                        {/* Email Input */}
                        <FormControl isInvalid={errors.email}>
                            <FormLabel>Email</FormLabel>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                {...register("email", { required: "Email is required" })}
                            />
                            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Password Input */}
                        <FormControl isInvalid={errors.password}>
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                placeholder="Enter password"
                                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } })}
                            />
                            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Confirm Password Input */}
                        <FormControl isInvalid={errors.confirmPassword}>
                            <FormLabel>Confirm Password</FormLabel>
                            <Input
                                type="password"
                                placeholder="Confirm your password"
                                {...register("confirmPassword", { required: "Please confirm your password" })}
                            />
                            <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Name Input */}
                        <FormControl isInvalid={errors.name}>
                            <FormLabel>Name</FormLabel>
                            <Input
                                type="text"
                                placeholder="Enter your user name"
                                {...register("name", { required: "Username is required" })}
                            />
                            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Phone Number Input */}
                        <FormControl isInvalid={errors.phoneNumber}>
                            <FormLabel>Phone Number</FormLabel>
                            <Input
                                type="text"
                                placeholder="Enter your contact number"
                                {...register("phoneNumber", { required: "Phone number is required" })}
                            />
                            <FormErrorMessage>{errors.phoneNumber?.message}</FormErrorMessage>
                        </FormControl>

                        {/* Submit Button */}
                        <Button type="submit" colorScheme="blue" isLoading={isLoading} width="full">
                            Register as
                        </Button>
                    </VStack>
                </form>
            </Box>
        </Center>
    );
};

export default Register;
