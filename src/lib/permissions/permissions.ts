export const permissions = {
  dashboardView: "dashboard.view",
  productsView: "products.view",
  productsCreate: "products.create",
  productsEdit: "products.edit",
  productsDelete: "products.delete",
  movementsView: "movements.view",
  entriesCreate: "entries.create",
  outputsCreate: "outputs.create",
  adjustmentsApprove: "adjustments.approve",
  costsView: "costs.view",
  exportsRun: "exports.run",
  importsRun: "imports.run",
  usersManage: "users.manage",
  auditView: "audit.view",
  settingsManage: "settings.manage",
} as const;

export type PermissionCode = (typeof permissions)[keyof typeof permissions];
