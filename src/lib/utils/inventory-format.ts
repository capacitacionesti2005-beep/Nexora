type FormatSettings = {
  currency: string;
  quantityDecimals: number;
  costDecimals: number;
};

function toNumber(input: unknown) {
  if (input === null || input === undefined || input === "") return 0;
  if (typeof input === "number") return input;
  if (typeof input === "object" && input !== null && "toNumber" in input && typeof input.toNumber === "function") {
    return input.toNumber();
  }
  return Number(input.toString());
}

function buildCurrencyFormatter(currency: string, decimals: number) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

export function createInventoryFormatter(settings: FormatSettings) {
  const quantityFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: settings.quantityDecimals,
    maximumFractionDigits: settings.quantityDecimals,
  });
  const costFormatter = buildCurrencyFormatter(settings.currency || "COP", settings.costDecimals);

  function quantity(input: unknown) {
    return quantityFormatter.format(toNumber(input));
  }

  function cost(input: unknown) {
    return costFormatter.format(toNumber(input));
  }

  function signedQuantity(type: string, input: unknown) {
    const amount = quantity(input);
    if (type === "IN") return `+${amount}`;
    if (type === "OUT") return `-${amount}`;
    return amount;
  }

  return { quantity, cost, signedQuantity };
}
