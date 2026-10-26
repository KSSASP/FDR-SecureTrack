export interface BankVerificationResult {
  status: 'DEMO_VERIFIED' | 'DEMO_MISMATCH' | 'NOT_CONNECTED';
  isSimulated: boolean;
  adapterName: string;
  confirmationReference?: string;
  verifiedAmount?: number;
  verifiedHolder?: string;
  verifiedBank?: string;
  verifiedBranch?: string;
  discrepancies: Array<{
    field: string;
    submittedValue: any;
    bankRecordValue: any;
    description: string;
  }>;
  disclaimer: string;
  timestamp: string;
}

export interface IBankVerificationAdapter {
  verifyFdr(fdrDetails: {
    fdrNumber: string;
    bankName: string;
    branchName?: string;
    amount: number;
    institutionName: string;
  }): Promise<BankVerificationResult>;
}

export class SimulatedBankVerificationAdapter implements IBankVerificationAdapter {
  async verifyFdr(fdrDetails: {
    fdrNumber: string;
    bankName: string;
    branchName?: string;
    amount: number;
    institutionName: string;
  }): Promise<BankVerificationResult> {
    const timestamp = new Date().toISOString();
    const cleanNumber = (fdrDetails.fdrNumber || '').trim().toUpperCase();

    // Check intentional simulation mismatch scenarios
    if (cleanNumber.includes('77881') || cleanNumber.includes('MISMATCH') || fdrDetails.amount > 50000000) {
      return {
        status: 'DEMO_MISMATCH',
        isSimulated: true,
        adapterName: 'SimulatedCoreBankingGateway-v2.1',
        confirmationReference: `SIM-ERR-${Math.floor(100000 + Math.random() * 900000)}`,
        verifiedAmount: fdrDetails.amount * 0.9, // 10% lower in bank record
        verifiedHolder: fdrDetails.institutionName,
        verifiedBank: fdrDetails.bankName,
        discrepancies: [
          {
            field: 'amount',
            submittedValue: fdrDetails.amount,
            bankRecordValue: fdrDetails.amount * 0.9,
            description: 'Bank balance ledger indicates deposit value is less than submitted instrument figure'
          }
        ],
        disclaimer: 'DEMONSTRATION SIMULATION: Discrepancy simulated for evaluation purposes. Not connected to live interbank switch.',
        timestamp
      };
    }

    if (cleanNumber.includes('OFFLINE') || cleanNumber.includes('DISCONNECT')) {
      return {
        status: 'NOT_CONNECTED',
        isSimulated: true,
        adapterName: 'SimulatedCoreBankingGateway-v2.1',
        discrepancies: [],
        disclaimer: 'DEMONSTRATION SIMULATION: Bank network gateway unreachable or API credentials unconfigured.',
        timestamp
      };
    }

    // Default successful demo confirmation
    return {
      status: 'DEMO_VERIFIED',
      isSimulated: true,
      adapterName: 'SimulatedCoreBankingGateway-v2.1',
      confirmationReference: `SIM-${fdrDetails.bankName.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      verifiedAmount: fdrDetails.amount,
      verifiedHolder: fdrDetails.institutionName,
      verifiedBank: fdrDetails.bankName,
      verifiedBranch: fdrDetails.branchName,
      discrepancies: [],
      disclaimer: 'DEMONSTRATION SIMULATION: Simulated bank confirmation generated for test workflows. Never treat as live banking confirmation.',
      timestamp
    };
  }
}

export const bankVerificationAdapter: IBankVerificationAdapter = new SimulatedBankVerificationAdapter();
