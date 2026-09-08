import { v4 as uuidv4 } from 'uuid';

export const generateId = (prefix: string): string => {
    // Backend uses Model.getPrefixId('t_') which just appends uuid to the prefix.
    // Ensure the prefix ends with an underscore if we want 't_uuid' format.
    const normalizedPrefix = prefix.endsWith('_') ? prefix : `${prefix}_`;
    return `${normalizedPrefix}${uuidv4()}`;
};
