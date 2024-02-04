import {ensureEnvVar} from "./helpers";
import {QldbDriver, RetryConfig} from "amazon-qldb-driver-nodejs";
import {NodeHttpHandlerOptions} from "@smithy/node-http-handler";
import {Agent} from "https";
import {QLDBSessionClientConfig} from "@aws-sdk/client-qldb-session";
import {defaults} from "lodash";

type QldbFactoryOptions = {
    maxConcurrentTransactions: number; retryLimit: number;
};

/**
 * QldbFactory is a factory class for creating singleton instances of QldbDriver.
 */
export class QldbFactory {
    private static _instances: { [ledger: string]: QldbDriver } = {};

    /**
     * Get the QldbDriver instance for the specified ledger.
     *
     * @param {string} ledger - The name of the ledger.
     * @param {string} region - The AWS region of this ledger.
     * @param options - Options for configuring the QLDB driver.
     * @return {QldbDriver} - The QldbDriver instance.
     */
    public static get(ledger: string, region: string | undefined = process.env.AWS_REGION, options?: QldbFactoryOptions): QldbDriver {
        const key = `${region}/${ledger}`
        if (!QldbFactory._instances[key]) QldbFactory._instances[key] = QldbFactory.build(ledger, region, options);

        return QldbFactory._instances[key];
    }

    /**
     * Retrieve a QldbDriver instance based on the environment variable.
     * If the environment variable is not provided, a default value will be used.
     *
     * @param {string} [envVar="QLDB_LEDGER"] - The name of the environment variable to retrieve the value from.
     * @return {QldbDriver} - The QldbDriver instance.
     */
    public static getFromEnv(envVar: string = "QLDB_LEDGER"): QldbDriver {
        return QldbFactory.get(ensureEnvVar(envVar));
    }

    /**
     * Builds and returns a QldbDriver instance for interacting with the Amazon QLDB. Typically, use the get method
     * to cache a singleton of the driver.
     *
     * @param {string} ledgerName - The name of the ledger to connect to.
     * @param {string} region - The AWS region to connect to. Defaults to the value of process.env.AWS_REGION if not provided.
     * @param {QldbFactoryOptions} options - Optional options for configuring the QldbDriver instance.
     * @return {QldbDriver} - A QldbDriver instance.
     */
    public static build(ledgerName: string, region: string | undefined = process.env.AWS_REGION, options?: QldbFactoryOptions,): QldbDriver {
        options = defaults(options, {
            maxConcurrentTransactions: 10, retryLimit: 4,
        });

        // Set HTTP client options
        const lowLevelClientHttpOptions: NodeHttpHandlerOptions = {
            httpAgent: new Agent({
                maxSockets: options.maxConcurrentTransactions,
            }),
        };

        // Set service options
        const serviceConfigurationOptions: QLDBSessionClientConfig = {region};

        // Construct the actual driver
        // Use driver's default backoff function for this example (no second parameter provided to RetryConfig)
        return new QldbDriver(ledgerName, serviceConfigurationOptions, lowLevelClientHttpOptions, options.maxConcurrentTransactions, new RetryConfig(options.retryLimit),);
    }
}
