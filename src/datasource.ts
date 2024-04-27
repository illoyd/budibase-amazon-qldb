import {IntegrationBase} from "@budibase/types"
import {QldbFactory} from "./qldb/qldb-factory";
import {QldbRepository} from "./qldb/qldb-repository";
import {QldbDriver} from "amazon-qldb-driver-nodejs";

class AmazonQldbDatasource implements IntegrationBase {
    private readonly region: string
    private readonly ledger: string
    private readonly table: string
    private readonly repository: QldbRepository

    constructor(config: { region: string; ledger: string, table: string }) {
        this.region = config.region
        this.ledger = config.ledger
        this.table = config.table
        this.repository = new QldbRepository(this.table, {idFieldName: "documentId"});
    }

    get db(): QldbDriver {
        return QldbFactory.get(this.ledger, this.region);
    }

    async create(query: { json: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.insert(txn, query.json));
    }

    async read(query: { json: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.where(txn, query.json));
    }

    async readById(query: { id: string }) {
        return this.db.executeLambda(async (txn) => this.repository.find(txn, query.id));
    }

    async update(query: { document: Record<string, unknown>, where: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.update(txn, query.document, query.where));
    }

    async updateById(query: { document: Record<string, unknown>, id: string }) {
        return this.db.executeLambda(async (txn) => this.repository.update(txn, query.document, {documentId: query.id}));
    }

    async upsert(query: { document: Record<string, unknown>, where: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.upsert(txn, query.document, query.where));
    }

    async insertInto(query: { field: string, document: Record<string, unknown>, where: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.insertInto(txn, query.field, query.document, query.where));
    }

    async insertIntoById(query: { field: string, document: Record<string, unknown>, id: string }) {
        return this.db.executeLambda(async (txn) => this.repository.insertInto(txn, query.field, query.document, {documentId: query.id}));
    }

    async delete(query: { json: Record<string, unknown> }) {
        return this.db.executeLambda(async (txn) => this.repository.delete(txn, query.json));
    }

    async deleteById(query: { id: string }) {
        return this.db.executeLambda(async (txn) => this.repository.delete(txn, {documentId: query.id}));
    }
}

export default AmazonQldbDatasource
