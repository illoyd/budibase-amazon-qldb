export const ensureEnvVar = (variableName: string): string => {
    const value = process.env[variableName];
    if (value === undefined)
        throw Error(`Environment variable "${variableName}" is not defined`);
    return value;
};

export const asJson = (value:any):object =>{
    return JSON.parse(JSON.stringify(value))
}