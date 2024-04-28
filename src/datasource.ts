import { IntegrationBase } from "@budibase/types";
import { QldbFactory } from "./qldb/qldb-factory";
import { QldbRepository } from "./qldb/qldb-repository";
import { QldbDriver } from "amazon-qldb-driver-nodejs";
import { asJson } from "./qldb/helpers";
import * as ion from "ion-js";

type Json = Record<string, unknown>;
type Extra = { table: string } & Record<string, string>;

type Query = { extra: Extra };
type WithJson = { json: Json } & Query;
type WithId = { id: string } & Query;
type WithWhere = { where: Json } & Query;
type WithField = { field: string } & Query;

const DEFAULT_ID_FIELD_NAME = "documentId";

class AmazonQldbDatasource implements IntegrationBase {
  private readonly region: string;
  private readonly ledger: string;
  private readonly repositoryOptions;
  private readonly repositories: WeakMap<Symbol, QldbRepository> =
    new WeakMap();

  constructor(config: { region: string; ledger: string; idFieldName: string }) {
    this.region = config.region;
    this.ledger = config.ledger;

    // Map to hold repositories; we'll use a WeakMap to allow it to purge old repositories when not in use
    this.repositoryOptions = {
      idFieldName: config.idFieldName ?? DEFAULT_ID_FIELD_NAME,
    };
  }

  protected get db(): QldbDriver {
    return QldbFactory.get(this.ledger, this.region);
  }

  async create(query: WithJson) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).insert(txn, query.json),
      ),
    );
  }

  async read(query: WithJson) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).where(txn, query.json),
      ),
    );
  }

  async readById(query: WithId) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).find(txn, query.id),
      ),
    );
  }

  async update(query: WithJson & WithWhere) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).update(
          txn,
          query.json,
          query.where,
        ),
      ),
    );
  }

  async updateById(query: WithId & WithWhere & WithJson) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).update(txn, query.json, {
          documentId: query.id,
        }),
      ),
    );
  }

  async upsert(query: WithJson & WithWhere) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).upsert(
          txn,
          query.json,
          query.where,
        ),
      ),
    );
  }

  async insertInto(query: WithJson & WithWhere & WithField) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).insertInto(
          txn,
          query.field,
          query.json,
          query.where,
        ),
      ),
    );
  }

  async insertIntoById(query: WithJson & WithId & WithField) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).insertInto(
          txn,
          query.field,
          query.json,
          {
            documentId: query.id,
          },
        ),
      ),
    );
  }

  async delete(query: WithJson) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).delete(txn, query.json),
      ),
    );
  }

  async deleteById(query: WithId) {
    return this.db.executeLambda(async (txn) =>
      this.normalise(
        await this.repository(query.extra.table).delete(txn, {
          documentId: query.id,
        }),
      ),
    );
  }

  protected repository(table: string): QldbRepository {
    const key = Symbol.for(table);
    if (!this.repositories.has(key))
      this.repositories.set(key, this.buildRepository(table));
    return this.repositories.get(key)!;
  }

  protected buildRepository(table: string): QldbRepository {
    return new QldbRepository(table, this.repositoryOptions);
  }

  protected normalise(value: ion.dom.Value): object;
  protected normalise(value: ion.dom.Value[]): object[];
  protected normalise(
    value: ion.dom.Value | ion.dom.Value[],
  ): object | object[] {
    return asJson(value);
  }
}

export default AmazonQldbDatasource;
