export function firstValueOf<Type>(value: Type | Type[]): Type {
    if (Array.isArray(value)) return value[0];
    return value;
}
