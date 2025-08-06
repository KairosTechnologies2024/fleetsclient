import React, { useEffect, useState, useRef } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Heading,
    Button,
    Center,
    Spinner,
    Flex,
    FormControl,
    FormLabel,
    Input,
    VStack,
    Text,
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Select,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Code,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay
} from "@chakra-ui/react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "lib/firebase";
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";

export default function Manager() {
    const [company, setCompany] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [companyId, setCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [users, setUsers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("Manager");
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editedName, setEditedName] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    const [formData, setFormData] = useState({
        companyName: "",
        contactPerson: "",
        phoneNumber: "",
        email: "",
    });

    const auth = getAuth();
    const loggedInEmail = auth.currentUser?.email;

    const cancelRef = useRef();

    const { isOpen: isRemoveOpen, onOpen: onRemoveOpen, onClose: onRemoveClose } = useDisclosure();
    const { isOpen: isDisableOpen, onOpen: onDisableOpen, onClose: onDisableClose } = useDisclosure();


    // Fetch company details always
    useEffect(() => {
        async function fetchCompanyDetails() {
            setLoading(true);
            try {
                // Query the company based on the logged-in user's email
                const companyQuery = query(
                    collection(db, "fleetOrganisations"),
                    where("email", "==", loggedInEmail)
                );

                const companySnapshot = await getDocs(companyQuery);

                if (!companySnapshot.empty) {
                    const companyDoc = companySnapshot.docs[0];
                    const companyData = companyDoc.data();

                    setCompany(companyData);
                    setCompanyId(companyDoc.id);

                    setFormData({
                        company: companyData.company || "",
                        contactPerson: companyData.contactPerson || "",
                        phoneNumber: companyData.phoneNumber || "",
                        email: companyData.email || "",
                    });
                } else {
                    console.warn("No company found for this user.");
                }
            } catch (error) {
                console.error("Error fetching company details:", error);
            }
            setLoading(false);
        }

        fetchCompanyDetails();
    }, [loggedInEmail]);


    // Fetch users details based on company
    useEffect(() => {
        async function fetchUsers() {
            if (!company?.company) return;

            try {
                const controllersQuery = query(
                    collection(db, "fleetControllers"),
                    where("company_id", "==", company.id)
                );

                const customersQuery = query(
                    collection(db, "fleetCustomers"),
                    where("company_id", "==", company.id)
                );

                const [controllersSnapshot, customersSnapshot] = await Promise.all([
                    getDocs(controllersQuery),
                    getDocs(customersQuery),
                ]);

                const controllers = controllersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Combine both collections
                const allUsers = [...controllers, ...customers];

                // Find the logged-in user in either collection
                const loggedInUser = allUsers.find(user => user.email === loggedInEmail);

                setUsers(allUsers); // Store all users
                setIsAdmin(loggedInUser?.role === "Admin");
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        }

        if (company) {
            fetchUsers();
        }
    }, [company, loggedInEmail]);



    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!companyId) return;

        try {
            await updateDoc(doc(db, "fleetOrganisations", companyId), {
                company: formData.companyName || company.company,
                contactPerson: formData.contactPerson || "",
                phoneNumber: formData.phoneNumber || "",
                email: formData.email || "",
            });

            setCompany(formData);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating company details:", error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            companyName: company?.company || "",
            contactPerson: company?.contactPerson || "",
            phoneNumber: company?.phoneNumber || "",
            email: company?.email || "",
        });
    };

    const isComplete = formData.companyName && formData.contactPerson && formData.phoneNumber && formData.email;

    // invite New user
    const handleInvite = async () => {
        if (!inviteEmail.includes("@")) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!inviteEmail || !company) return;

        const functions = getFunctions();
        const inviteFleetControllers = httpsCallable(functions, "inviteFleetControllers");

        try {
            const response = await inviteFleetControllers({
                inviteEmail,
                inviteRole,
                company: company.company,
                company_id: company.id,
            });

            console.log("✅ Invite sent:", response.data);
            alert("Invite sent successfully!");
            onClose();
        } catch (error) {
            console.error("❌ Error sending invite:", error);
            alert("Failed to send invite.");
        }
    };

    //Remove User
    const handleRemoveUser = async () => {
        if (!selectedUser?.id || !selectedUser?.email) return;

        try {
            const functions = getFunctions();
            const removeUserFunction = httpsCallable(functions, "removeFleetController");

            await removeUserFunction({ userId: selectedUser.id, userEmail: selectedUser.email });

            setUsers(users.filter(user => user.id !== selectedUser.id));
            alert("User successfully removed.");
        } catch (error) {
            console.error("❌ Error removing user:", error);
            alert("Failed to remove user.");
        } finally {
            onRemoveClose();
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setEditedName(user.name || "");
        setIsEditUserOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser?.id) return;

        try {
            const userRef = doc(db, "fleetControllers", selectedUser.id);
            await updateDoc(userRef, { name: editedName });

            // Update local state
            setUsers(users.map(user => user.id === selectedUser.id ? { ...user, name: editedName } : user));

            alert("User details updated successfully!");
            setIsEditUserOpen(false);
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user details.");
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser?.email) return;

        try {
            await sendPasswordResetEmail(getAuth(), selectedUser.email);
            alert(`Password reset email sent to ${selectedUser.email}`);
        } catch (error) {
            console.error("Error resetting password:", error);
            alert("Failed to send password reset email.");
        }
    };

    //Disable User Button
    const handleDisableUser = async () => {
        try {
            const q = query(collection(db, "fleetControllers"), where("email", "==", selectedUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                querySnapshot.forEach(async (userDoc) => {
                    const userRef = doc(db, "fleetControllers", userDoc.id);
                    const newStatus = selectedUser.status === "disabled" ? "active" : "disabled";
                    await updateDoc(userRef, { status: newStatus });
                });
                alert(`User ${selectedUser.status === "disabled" ? "enabled" : "disabled"} successfully`);
            } else {
                alert("User not found in fleetControllers");
            }
        } catch (error) {
            console.error("Error toggling user status:", error);
        } finally {
            onDisableClose();
        }
    };


    if (loading) {
        return (
            <Center h="100vh">
                <Spinner color="teal.500" />
            </Center>
        );
    }

    //Check admin role
    // if (!isAdmin) {
    //     return <Text>Admin needed</Text>;
    // }

    return (
        <Center p={5} flexDirection="column" gap={5}>
            {/* Company Info */}
            <Box w="full" maxW="100%" h="400px" maxH="500px" mb={isEditing ? 100 : 0}>
                <Card w="full" p={4} boxShadow="lg">
                    <CardHeader>
                        <Heading size="md">{company ? company.company : "No Company Found"}</Heading>
                    </CardHeader>
                    <CardBody>
                        {isEditing ? (
                            <VStack spacing={3}>
                                <FormControl>
                                    <FormLabel>Company Name</FormLabel>
                                    <Input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Enter company name" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Contact Person</FormLabel>
                                    <Input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} placeholder="Enter contact person" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Phone Number</FormLabel>
                                    <Input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="Enter phone number" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Email</FormLabel>
                                    <Input name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email" />
                                </FormControl>
                                <Flex gap={3}>
                                    <Button colorScheme="green" onClick={handleSubmit}>Submit</Button>
                                    <Button colorScheme="red" onClick={handleCancel}>Cancel</Button>
                                </Flex>
                            </VStack>
                        ) : (
                            <VStack spacing={3} align="start">
                                <Text><b>Company Name:</b> {company?.company || "N/A"}</Text>
                                <Text><b>Contact Person:</b> {company?.contactPerson || "N/A"}</Text>
                                <Text><b>Phone Number:</b> {company?.phoneNumber || "N/A"}</Text>
                                <Text><b>Email:</b> {company?.email || "N/A"}</Text>
                                <Flex justify="start" w="full">
                                    <Button colorScheme="blue" onClick={() => setIsEditing(true)}>
                                        {isComplete ? "Edit" : "Complete Company Registration"}
                                    </Button>
                                </Flex>
                            </VStack>
                        )}
                    </CardBody>
                </Card>
            </Box>

            {/* Users */}
            <Box w="full" maxW="100%">
                <Card w="full" p={4} boxShadow="lg">
                    <CardHeader>
                        <Flex justifyContent="space-between">
                            <Heading size="md">Users</Heading>
                            <Button colorScheme="teal" onClick={onOpen}>Invite</Button>
                        </Flex>
                    </CardHeader>
                    <CardBody>
                        {users.length > 0 ? (
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Name</Th>
                                        <Th>Email</Th>
                                        <Th>Phone</Th>
                                        <Th>Role</Th>
                                        <Th>Status</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {users.map(user => (
                                        <Tr key={user.id}>
                                            <Td>{user.name}</Td>
                                            <Td>{user.email}</Td>
                                            <Td>{user.phone}</Td>
                                            <Td>{user.role}</Td>
                                            <Td>{user.status}</Td>
                                            <Td>
                                                <Button
                                                    colorScheme="blue"
                                                    size="sm"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    colorScheme="red"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        onRemoveOpen();
                                                    }}
                                                    isDisabled={!(user.role === "Manager" || user.role === "Operator")}
                                                    ml={2}
                                                >
                                                    Remove
                                                </Button>
                                                <Button
                                                    colorScheme={user.status === "disabled" ? "green" : "gray"}
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        onDisableOpen();
                                                    }}
                                                    isDisabled={!(user.role === "Manager" || user.role === "Operator")}
                                                    ml={2}
                                                >
                                                    {user.status === "disabled" ? "Enable" : "Disable"}
                                                </Button>

                                            </Td>

                                        </Tr>
                                    ))}
                                </Tbody>

                            </Table>
                        ) : (
                            <Text>No users found for this company.</Text>
                        )}
                    </CardBody>
                </Card>

                {/* Remove User Confirmation Dialog */}
                <AlertDialog
                    isOpen={isRemoveOpen}
                    leastDestructiveRef={cancelRef}
                    onClose={onRemoveClose}
                >
                    <AlertDialogOverlay>
                        <AlertDialogContent>
                            <AlertDialogHeader fontSize="lg" fontWeight="bold">
                                Remove User
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                Are you sure you want to remove {selectedUser?.name}? This action cannot be undone.
                            </AlertDialogBody>
                            <AlertDialogFooter>
                                <Button ref={cancelRef} onClick={onRemoveClose}>
                                    Cancel
                                </Button>
                                <Button colorScheme="red" onClick={handleRemoveUser} ml={3}>
                                    Remove
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialogOverlay>
                </AlertDialog>

                {/* Disable User Confirmation Dialog */}
                <AlertDialog
                    isOpen={isDisableOpen}
                    leastDestructiveRef={cancelRef}
                    onClose={onDisableClose}
                >
                    <AlertDialogOverlay>
                        <AlertDialogContent>
                            <AlertDialogHeader fontSize="lg" fontWeight="bold">
                                Disable User
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                Are you sure you want to disable {selectedUser?.name}? They will no longer be able to access the system.
                            </AlertDialogBody>
                            <AlertDialogFooter>
                                <Button ref={cancelRef} onClick={onDisableClose}>
                                    Cancel
                                </Button>
                                <Button
                                    colorScheme={selectedUser?.status === "disabled" ? "green" : "gray"}
                                    onClick={handleDisableUser}
                                    ml={3}
                                >
                                    {selectedUser?.status === "disabled" ? "Enable" : "Disable"}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialogOverlay>
                </AlertDialog>
            </Box>

            {/* Invite Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Invite a User</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl>
                            <FormLabel>Email</FormLabel>
                            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                        </FormControl>
                        <FormControl mt={4}>
                            <FormLabel>Role</FormLabel>
                            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                                <option value="Manager">Manager</option>
                                <option value="Operator">Operator</option>
                            </Select>
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="teal" onClick={handleInvite}>Send Invite</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit model */}
            <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit User</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl>
                            <FormLabel>Name</FormLabel>
                            <Input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" onClick={handleUpdateUser}>
                            Save Changes
                        </Button>
                        <Button colorScheme="red" ml={3} onClick={handleResetPassword}>
                            Reset Password
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </Center>

    );
}
