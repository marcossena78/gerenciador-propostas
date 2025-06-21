export const formatCPF = (value: string): string => {
  if (!value) return '';
  const cpf = value.replace(/\D/g, '');
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};

export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Normalize accents
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Formats a number or string to a BRL currency string.
 * e.g., 1234.56 -> "R$ 1.234,56"
 * e.g., "1234.56" -> "R$ 1.234,56"
 * e.g., "R$ 1.234,56" -> "R$ 1.234,56" (idempotent for already formatted strings)
 */
export const formatBRL = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === '') {
    return 'R$ 0,00';
  }

  let numericValue: number;

  if (typeof value === 'string') {
    // Attempt to parse strings like "10000.00", "10.000,00", or "R$ 10.000,00"
    const cleanedValue = value
      .replace('R$', '')
      .trim()
      .replace(/\./g, (match, offset, fullString) => {
        // Only remove dots if they are thousand separators, not decimal points if input is like "123.45"
        // This regex helps by checking if a comma follows later, common in BRL full format.
        // A simpler approach for general numbers: assume dot is for thousands if comma for decimal is present.
        // For this function, we'll remove all dots first then replace comma.
        return fullString.includes(',') ? '' : match; 
      })
      .replace(',', '.'); // Replace decimal comma with dot for parseFloat
    
    // If the cleaned value after removing R$ and trimming still contains non-numeric characters (except a single decimal point)
    // it might be an invalid format.
    // A simpler cleaning for parseFloat:
    const simplerCleanedValue = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');


    numericValue = parseFloat(simplerCleanedValue);
     if (isNaN(numericValue) && value.includes('R$')) { // Try more aggressive cleaning if original was R$
        const aggressiveCleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
        numericValue = parseFloat(aggressiveCleaned);
    }


  } else {
    numericValue = value;
  }

  if (isNaN(numericValue)) {
    // Fallback for values that couldn't be parsed, e.g. "abc"
    // Check if original string was just "0" or "0,00" etc.
    if (typeof value === 'string' && parseFloat(value.replace(',', '.')) === 0) return 'R$ 0,00';
    return 'R$ 0,00'; 
  }

  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


/**
 * Formats a raw string of digits (from input) into a BRL currency string as the user types.
 * e.g., "12345" -> "R$ 123,45"
 */
export const formatInputAsCurrencyBR = (value: string): string => {
  if (!value) return 'R$ 0,00';

  let digits = value.replace(/\D/g, ''); 
  if (digits === '') return 'R$ 0,00';

  // Prevent excessively long numbers if needed, e.g.
  // if (digits.length > 15) digits = digits.substring(0, 15);

  const numericValue = parseInt(digits, 10);

  if (isNaN(numericValue)) { // Should not happen with \D removal but as a safe guard
    return 'R$ 0,00';
  }

  // Convert to currency format, treating the number as cents
  const formattedValue = (numericValue / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formattedValue;
};
