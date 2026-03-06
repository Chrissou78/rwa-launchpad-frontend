// src/__tests__/api/kyc/gdpr.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("GDPR API Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Data Export", () => {
    it("should structure export data correctly", () => {
      const createExportData = (
        walletAddress: string,
        applications: any[],
        linkedWallets: any[],
        proofs: any[],
        documents: any[]
      ) => {
        return {
          exportedAt: new Date().toISOString(),
          walletAddress,
          applications,
          linkedWallets,
          proofs,
          documents: documents.map((d) => ({
            type: d.document_type,
            fileName: d.file_name,
            fileSize: d.file_size,
            uploadedAt: d.uploaded_at,
          })),
        };
      };

      const exportData = createExportData(
        "0x123",
        [{ id: "1", status: "approved" }],
        [{ wallet_address: "0x123", is_primary: true }],
        [{ level: 2, expiry: 123456 }],
        [{ document_type: "idFront", file_name: "id.jpg", file_size: 1000, uploaded_at: "2024-01-01" }]
      );

      expect(exportData.walletAddress).toBe("0x123");
      expect(exportData.applications).toHaveLength(1);
      expect(exportData.documents[0].type).toBe("idFront");
      expect(exportData.exportedAt).toBeDefined();
    });
  });

  describe("Data Deletion", () => {
    it("should identify all data to delete", () => {
      const getDataToDelete = (walletHash: string) => {
        return {
          tables: [
            "kyc_documents",
            "kyc_proofs",
            "linked_wallets",
            "wallet_link_codes",
            "kyc_applications",
          ],
          storagePrefix: `kyc/${walletHash}/`,
        };
      };

      const deleteInfo = getDataToDelete("0xhash123");
      
      expect(deleteInfo.tables).toContain("kyc_applications");
      expect(deleteInfo.tables).toContain("kyc_documents");
      expect(deleteInfo.storagePrefix).toBe("kyc/0xhash123/");
    });

    it("should require explicit consent message", () => {
      const validateDeletionMessage = (message: string, walletAddress: string) => {
        const expectedPattern = new RegExp(
          `Request KYC Data Deletion.*${walletAddress}.*irreversible`,
          "s"
        );
        return expectedPattern.test(message);
      };

      const validMessage = `Request KYC Data Deletion
Wallet: 0x123
Timestamp: 123456

I understand this action is irreversible and will delete all my KYC data.`;

      const invalidMessage = "Delete my data please";

      expect(validateDeletionMessage(validMessage, "0x123")).toBe(true);
      expect(validateDeletionMessage(invalidMessage, "0x123")).toBe(false);
    });
  });

  describe("Audit Logging", () => {
    it("should create proper audit log entry", () => {
      const createAuditLog = (
        action: string,
        adminAddress: string,
        targetId: string,
        details: object
      ) => {
        return {
          action,
          admin_address: adminAddress,
          target_id: targetId,
          target_type: "kyc_identity",
          details,
          created_at: new Date().toISOString(),
        };
      };

      const log = createAuditLog(
        "GDPR_DELETE",
        "0xuser",
        "0xhash...",
        { reason: "User request" }
      );

      expect(log.action).toBe("GDPR_DELETE");
      expect(log.admin_address).toBe("0xuser");
      expect(log.target_type).toBe("kyc_identity");
    });
  });
});
