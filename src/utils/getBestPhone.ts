/**
 * Get the best available phone number from a lead object
 */
export function getBestPhone(lead: any): string | undefined {
  // Check direct phone fields first
  const directFields = [
    lead.phone, 
    lead.phone_number, 
    lead.mobile, 
    lead.mobile_number
  ];
  
  for (const field of directFields) {
    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }
  
  // Check contact_phone_numbers array (from database - JSON string)
  if (lead.contact_phone_numbers) {
    try {
      const phoneNumbers = typeof lead.contact_phone_numbers === 'string' 
        ? JSON.parse(lead.contact_phone_numbers) 
        : lead.contact_phone_numbers;
        
      if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        const phoneObj = phoneNumbers[0];
        if (phoneObj && typeof phoneObj === "object") {
          const number = phoneObj.sanitizedNumber || phoneObj.rawNumber;
          if (typeof number === "string" && number.trim()) {
            return number.trim();
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  // Check contactPhoneNumbers array (from API response)
  if (Array.isArray(lead.contactPhoneNumbers) && lead.contactPhoneNumbers.length > 0) {
    const phoneObj = lead.contactPhoneNumbers[0];
    if (phoneObj && typeof phoneObj === "object") {
      const number = phoneObj.sanitizedNumber || phoneObj.rawNumber;
      if (typeof number === "string" && number.trim()) {
        return number.trim();
      }
    }
  }
  
  return undefined;
}