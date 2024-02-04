export type JSONValue =
    | string
    | number
    | boolean
    | Date
    | JSONObject
    | JSONArray
    | null;
export type JSONObject = { [x: string]: JSONValue };
export type JSONArray = Array<JSONValue>;

export type Email = {
    email: string;
    verified: boolean;
    status: "active" | "inactive";
    createdAt: Date;
    updatedAt: Date;
    verifiedAt?: Date;
    primary?: boolean;
};

export type Phone = {
    phone: string;
    verified: boolean;
    status: "active" | "inactive";
    preferredContactMethod: string;
    createdAt: Date;
    updatedAt: Date;
    verifiedAt?: Date;
};

export type TaxIdentifier = {
    country: string;
    identifier: string;
};

export type Person = {
    id: string;
    title?: string;
    forename?: string;
    middleName?: string;
    surname?: string;
    previousSurnames?: string[];
    fullName?: string;
    dob?: Date;
    dod?: Date;
    ethnicity?: string;
    gender?: string;

    // Preferences
    preferredName?: string;
    picture?: string;
    currency?: string;
    locale?: string;

    // Contact info
    emails?: Email[];
    phones?: Phone[];

    // Nationalities and taxes
    birthCountry?: string;
    nationalities?: string[];
    taxResidencies?: string[];
    taxNumbers?: TaxIdentifier[];

    // Occupation and lifestyle
    maritalStatus?: string;
    occupation?: string;
    industry?: string;
    company: string;
    jobTitle: string;
    income: number;
    sourceOfFunds: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // original: response, // Uncomment to include the raw data for testing purposes
};
