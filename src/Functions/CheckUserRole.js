import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "lib/firebase";

// Check if a company is approved
async function isCompanyApproved(companyId) {
  const fleetOrganisationQuery = query(
    collection(db, "fleetOrganisations"),
    where("id", "==", companyId)
  );
  const snapshot = await getDocs(fleetOrganisationQuery);
  if (!snapshot.empty) {
    const org = snapshot.docs[0].data();
    return org.status === "approved";
  }
  
  return false;
}

// Role Checker
export async function checkUserRole(userId) {
  const rolesToCheck = [
    { collectionName: "fleetControllers", redirectRole: true },
    { collectionName: "customers", redirectRole: true },
    { collectionName: "fleetCustomers", redirectRole: false },
  ];

  for (const { collectionName, redirectRole } of rolesToCheck) {
    const q = query(collection(db, collectionName), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();

      const approved = await isCompanyApproved(userData.company_id);
      if (!approved) {
        throw new Error("Your company is not approved.");
      }

      if (collectionName === "fleetControllers" && userData.status !== "active") {
        throw new Error("Your fleet controller account is not active.");
      }

      return {
        role: collectionName,
        data: userData,
        isAdmin: userData.role === "admin",
      };
    }
  }

  throw new Error("User not found in any valid role collection.");
}
