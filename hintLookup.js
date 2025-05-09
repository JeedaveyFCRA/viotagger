const hintLookup = {
  "EQ": [
    {
      label: "Included in Bankruptcy (Post-Discharge)",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Tradeline shows 'Included in Bankruptcy' after Chapter 13 discharge was issued.",
      severity: "🔴"
    },
    {
      label: "Balance: $0 or Missing",
      covers: ["§1681c(f)", "§1681s-2(a)(1)(A)"],
      action: "Balance is incorrectly reported as $0 or missing when a non-zero balance existed pre-discharge.",
      severity: "🔴"
    },
    {
      label: "Status Frozen Since 2018",
      covers: ["§1681e(b)", "§1681c(a)(4)"],
      action: "Last update date is stuck on an old value and not refreshed monthly as required.",
      severity: "🟠"
    },
    {
      label: "Incorrect Bankruptcy Type",
      covers: ["§1681g(a)(1)"],
      action: "Account status refers to incorrect bankruptcy chapter (e.g., Chapter 7 instead of Chapter 13).",
      severity: "🟠"
    }
  ],
  "EX": [
    {
      label: "Account Status: Petition Filed",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Account status reflects a 'Petition Filed' years after the bankruptcy was discharged.",
      severity: "🔴"
    },
    {
      label: "High Balance Retained After Discharge",
      covers: ["§1681e(b)", "§1681s-2(b)"],
      action: "High balance field shows inflated or retained balance from before discharge.",
      severity: "🔴"
    },
    {
      label: "Monthly Payment: - or Blank",
      covers: ["§1681e(b)"],
      action: "Monthly payment field is blank or contains a dash, despite ongoing reporting.",
      severity: "🟠"
    },
    {
      label: "Late Payments During Protected Period",
      covers: ["§1681c(f)", "§1681s-2(a)(1)(A)"],
      action: "Payment history shows delinquencies during bankruptcy's active protection period.",
      severity: "🔴"
    }
  ],
  "TU": [
    {
      label: "Date Updated Not Advancing",
      covers: ["§1681c(a)(4)"],
      action: "Tradeline shows the same 'last updated' date for multiple years.",
      severity: "🟠"
    },
    {
      label: "Account Status Misrepresents Closure",
      covers: ["§1681e(b)"],
      action: "Tradeline implies open status or payment due when account was closed/discharged.",
      severity: "🔴"
    },
    {
      label: "Incorrect High Credit",
      covers: ["§1681e(b)", "§1681s-2(b)"],
      action: "High credit remains inflated or misreported long after account resolution.",
      severity: "🟠"
    },
    {
      label: "Obsolete Account Reporting",
      covers: ["§1681c(a)(1)"],
      action: "Account continues reporting past the legal 7-year limit.",
      severity: "🟡"
    }
  ]
};
