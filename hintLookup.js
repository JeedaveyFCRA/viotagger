const hintLookup = {
  "EQ": [
    {
      label: "Account Status: INCLUDED_IN_CHAPTER_13",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Account misreported as active in Chapter 13 after discharge",
      severity: "🔴"
    },
    {
      label: "Reported Balance: $0",
      covers: ["§1681e(b)", "§1681c(f)"],
      action: "Zero balance misreported with discharge context",
      severity: "🔴"
    },
    {
      label: "Available Credit",
      covers: ["§1681e(b)"],
      action: "Available credit field inaccurate or blank",
      severity: "🟠"
    },
    {
      label: "High Credit",
      covers: ["§1681e(b)"],
      action: "High credit not accurately reflected",
      severity: "🟠"
    },
    {
      label: "Credit Limit",
      covers: ["§1681e(b)"],
      action: "Missing or inaccurate limit field",
      severity: "🟠"
    },
    {
      label: "Balance: $0",
      covers: ["§1681e(b)", "§1681c(f)"],
      action: "Blank or false balance after discharge",
      severity: "🔴"
    },
    {
      label: "Date Reported: Oct 25, 2018",
      covers: ["§1681c(a)(4)", "§1681e(b)"],
      action: "Frozen/stale date from pre-discharge era",
      severity: "🟠"
    },
    {
      label: "Bankruptcy Chapter 13",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Incorrect bankruptcy reporting",
      severity: "🔴"
    },
    {
      label: "Bankruptcy Completed",
      covers: ["§1681e(b)"],
      action: "Status not updated after discharge",
      severity: "🟠"
    }
  ],
  "TU": [
    {
      label: "Date Updated: 02/19/2024",
      covers: ["§1681s-2(a)(1)(A)", "§1681e(b)"],
      action: "Date updated but data still inaccurate",
      severity: "🟠"
    },
    {
      label: "Pay Status: >Account Included in Bankruptcy<",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Misleading status post-discharge",
      severity: "🔴"
    },
    {
      label: "Date Closed: 02/19/2024",
      covers: ["§1681s-2(a)(1)(A)", "§1681e(b)"],
      action: "Wrong or backdated closure",
      severity: "🟠"
    },
    {
      label: "Remarks: CHAPTER 13 BANKRUPTCY",
      covers: ["§1681c(f)", "§1681e(b)"],
      action: "Misreported bankruptcy notation",
      severity: "🔴"
    },
    {
      label: "On Record Until: 09/2025",
      covers: ["§1681e(b)", "§1681c(a)(1)"],
      action: "Incorrect or outdated removal date",
      severity: "🟡"
    }
  ],
  "EX": [
    {
      label: "Status: Discharged through Bankruptcy Chapter 13",
      covers: ["§1681s-2(a)(1)(A)", "§1681c(a)(4)", "§1681e(b)"],
      action: "Status fails to reflect discharge update",
      severity: "🔴"
    },
    {
      label: "Status Updated: Oct 2018",
      covers: ["§1681c(a)(4)", "§1681s-2(a)(1)(A)"],
      action: "Stale 'Status Updated' field from years earlier",
      severity: "🟠"
    },
    {
      label: "Balance: -",
      covers: ["§1681e(b)", "§1681c(f)"],
      action: "Missing balance value post-discharge",
      severity: "🔴"
    },
    {
      label: "Balance Updated: -",
      covers: ["§1681e(b)", "§1681c(a)(4)"],
      action: "No recent balance update post-discharge",
      severity: "🟠"
    },
    {
      label: "Recent Payment: -",
      covers: ["§1681e(b)"],
      action: "Missing/blank payment activity",
      severity: "🟠"
    },
    {
      label: "Monthly Payment: -",
      covers: ["§1681e(b)"],
      action: "Monthly payment field missing",
      severity: "🟠"
    },
    {
      label: "Highest Balance: -",
      covers: ["§1681e(b)"],
      action: "Missing highest balance field",
      severity: "🟠"
    },
    {
      label: "On Record Until: Oct 2025",
      covers: ["§1681e(b)", "§1681c(a)(1)"],
      action: "Incorrect or outdated removal date",
      severity: "🟡"
    }
  ]
};
