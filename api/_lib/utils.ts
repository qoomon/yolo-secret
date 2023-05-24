export function firstValueOf<Type>(value: Type | Type[]): Type {
    if (Array.isArray(value)) return value[0];
    return value;
}

export const BASE64_REGEX = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/
