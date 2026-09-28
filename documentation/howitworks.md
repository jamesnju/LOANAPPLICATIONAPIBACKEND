Based on what you have currently built, the customer journey would look like this:

### Example: James wants to apply for a KSh 20,000 loan

1. **Register**

   * James creates an account using his name, email, phone number and password.
   * The system sends an OTP for account verification.

2. **Verify account & Login**

   * James enters the OTP.
   * After verification, he logs in.
   * The login response tells the frontend whether his KYC has been completed.

3. **Complete KYC**

   * Since James has not completed KYC, the system takes him to the KYC page.
   * He provides:

     * Identification details
     * Date of birth
     * Address/location
     * Employment information
     * Income information
     * Required documents
   * His KYC status becomes **PENDING**.

4. **KYC Review**

   * An admin/authorized officer opens the admin KYC section.
   * They review James's information and uploaded documents.
   * If everything is okay, the KYC becomes **APPROVED**.

5. **View Loan Products**

   * James logs into his dashboard.
   * He opens **Loans → Apply for Loan**.
   * The system displays active loan products, for example:

   **Standard Loan**

   * Minimum: KSh 1,000
   * Maximum: KSh 50,000
   * Repayment: 30–90 days
   * Interest: 5%

6. **Apply**

   * James selects the Standard Loan.
   * He enters:

     * Amount: **KSh 20,000**
     * Repayment period: **60 days**
     * Purpose: **School expenses**
   * The backend checks:

     * KYC is approved
     * Loan product is active
     * Amount is within allowed limits
     * Repayment period is within allowed limits
     * James doesn't already have an active loan
     * James doesn't have another application under review

7. **Application Submitted**

   * The system creates an application such as:
     `APP-1759051234567-4821`
   * Status becomes **SUBMITTED**.
   * James can see it under **My Loan Applications**.

8. **Loan Officer/Admin Review**

   * The authorized officer opens the application.
   * They can:

     * Put it **UNDER_REVIEW**
     * Request additional documents
     * **APPROVE**
     * **REJECT**

9. **If approved**

   * Currently, your system changes the application to **APPROVED**.
   * **The next module we need to build is the Loan module**, which will turn the approved application into an actual loan, calculate the loan amounts, create the repayment schedule, and eventually handle disbursement.

### In simple terms

```text
Register
   ↓
Verify Account
   ↓
Login
   ↓
Complete KYC
   ↓
Upload Documents
   ↓
KYC Review
   ↓
KYC APPROVED
   ↓
View Loan Products
   ↓
Select Loan Product
   ↓
Enter Amount + Repayment Period
   ↓
Submit Application
   ↓
Application UNDER_REVIEW
   ↓
Loan Officer/Admin Decision
   ↓
APPROVED
   ↓
Create Actual Loan        ← NEXT MODULE
   ↓
Disbursement
   ↓
Repayment Schedule
   ↓
Payments
```

So **what you have achieved currently gets the customer all the way from registration to submitting a loan application and having that application reviewed**. The major piece after approval is the **actual Loan/Disbursement/Repayment module**.
