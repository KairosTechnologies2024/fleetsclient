import {
  Box,
  Button,
  Center,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Heading,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MANAGER } from "lib/routes";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();

  async function handleRegister(data) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        const userId = user.uid;
        const guid = crypto.randomUUID();
        // Save company fleetOrganisations
        await addDoc(collection(db, "fleetOrganisations"), {
          id: guid,
          email: data.email,
          company: data.company,
          createdBy: userId,
          createdAt: new Date(),
        });

        // Save user data in fleetCustomers
        await addDoc(collection(db, "fleetCustomers"), {
          userId,
          email: data.email,
          role: "admin",
          company: data.company,
          name: data.name,
          phoneNumber: data.phoneNumber,
          company_id: guid,
        });



        toast({
          title: "Success",
          description: "Admin account created successfully!",
          status: "success",
          isClosable: true,
          position: "top",
          duration: 5000,
        });

        navigate(MANAGER);
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
  }



  return (
    <Center minH="100vh">
      <Box p={6} boxShadow="md" borderRadius="lg" bg="white" maxW="400px" w="full">
        <Heading size="lg" textAlign="center" mb={4}>
          Admin Registration
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

            {/* Confirm Password */}
            <FormControl isInvalid={errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                placeholder="Confirm your password"
                {...register("confirmPassword", { required: "Please confirm your password" })}
              />
              <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
            </FormControl>

            {/* Company Input */}
            <FormControl isInvalid={errors.company}>
              <FormLabel>Company</FormLabel>
              <Input
                type="text"
                placeholder="Enter your company name"
                {...register("company", { required: "Company name is required" })}
              />
              <FormErrorMessage>{errors.company?.message}</FormErrorMessage>
            </FormControl>

            {/* Name Input */}
            <FormControl isInvalid={errors.name}>
              <FormLabel>Name</FormLabel>
              <Input
                type="text"
                placeholder="Enter your user name"
                {...register("name", { required: "Username name is required" })}
              />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            {/* Contact Input */}
            <FormControl isInvalid={errors.name}>
              <FormLabel>Phone Number</FormLabel>
              <Input
                type="text"
                placeholder="Enter your contact Number"
                {...register("phoneNumber", { required: "Phone Number is required" })}
              />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            {/* Submit Button */}
            <Button type="submit" colorScheme="blue" isLoading={isLoading} width="full">
              Register as Admin
            </Button>
          </VStack>
        </form>
      </Box>
    </Center>
  );
}
