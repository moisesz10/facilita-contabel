export const formatCurrency = (val) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

export const formatCnpj = (value = "") => {
  const clean = value.replace(/\D/g, "");
  if (clean.length === 14) {
    return clean.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const getDaysRemaining = (expString) => {
  if (!expString) return null;
  const diffTime = new Date(expString) - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
