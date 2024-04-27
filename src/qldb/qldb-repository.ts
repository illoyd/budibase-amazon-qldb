import { TransactionExecutor } from "amazon-qldb-driver-nodejs";
import * as ion from "ion-js";
import { defaults } from "lodash";

type Options = {
  idFieldName: string;
};

export class QldbRepository {
  protected readonly table: string;
  protected readonly options: Options;

  constructor(table: string, options?: Options) {
    this.table = table;
    this.options = defaults(options, { idFieldName: "_id" });
  }

  get idFieldName() {
    return this.options.idFieldName;
  }

  async all(txn: TransactionExecutor) {
    return this.do(
      txn,
      `SELECT *
                             FROM ${this.table} BY ${this.idFieldName}`,
    );
  }

  async find(txn: TransactionExecutor, id: string) {
    return this.findBy(txn, { [this.idFieldName]: id });
  }

  async findBy(txn: TransactionExecutor, where: Record<string, unknown>) {
    return (await this.where(txn, where))[0];
  }

  async where(txn: TransactionExecutor, where: Record<string, unknown>) {
    const { fields, values } = this.splitFields(where);
    return this.do(txn, this.selectByQuery(fields), ...values);
  }

  async insert(txn: TransactionExecutor, document: Record<string, unknown>) {
    // Add 'createdAt' if not defined
    document.createdAt ??= new Date(Date.now());
    document.updatedAt ??= document.createdAt;

    const results = await this.do(txn, this.insertQuery(), document);
    const id = results[0].get(this.idFieldName)!.stringValue()!;
    return this.find(txn, id);
  }

  async insertInto(
    txn: TransactionExecutor,
    field: string,
    document: Record<string, unknown>,
    where: Record<string, unknown>,
  ) {
    const { fields, values } = this.splitFields(where);
    const results = await this.do(
      txn,
      this.insertIntoQuery(field, fields),
      ...values,
      document,
    );
    const id = results[0].get(this.idFieldName)!.stringValue()!;
    return this.find(txn, id);
  }

  async update(
    txn: TransactionExecutor,
    document: Record<string, unknown>,
    where: Record<string, unknown>,
  ) {
    // Add updatedAt if not already set
    document.updatedAt ??= new Date(Date.now());

    // Split the document and where clauses into fields and values
    const u = this.splitFields(document);
    const w = this.splitFieldsWithOperator(where);

    // Assemble the query and execute
    const query = this.updateQuery(u.fields, w.fields);
    return this.do(txn, query, ...u.values, ...w.values);
  }

  async upsert(
    txn: TransactionExecutor,
    document: Record<string, unknown>,
    where: Record<string, unknown>,
  ) {
    const existing = await this.where(txn, where);

    // Nothing existing, so insert
    switch (existing.length) {
      case 0:
        return this.insert(txn, document);
      case 1:
        let response = await this.update(txn, document, where);
        return response[0];
      default:
        throw Error(
          `Upsert matched multiple documents; searching for ${where}, found ${existing.length} documents`,
        );
    }
  }

  async delete(txn: TransactionExecutor, where: Record<string, unknown>) {
    const { fields, values } = this.splitFields(where);
    return this.do(txn, this.deleteByQuery(fields), ...values);
  }

  async do(
    txn: TransactionExecutor,
    query: string,
    ...params: unknown[]
  ): Promise<ion.dom.Value[]> {
    console.info("Query", query, "with", params);
    return (await txn.execute(query, ...params)).getResultList();
  }

  protected splitFields(obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    return {
      fields: entries.map((entry) => entry[0]),
      values: entries.map((entry) => entry[1]),
    };
  }

  protected splitFieldsWithOperator(obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    return {
      fields: entries.map((entry) => ({
        name: entry[0],
        operator: this.operatorForValue(entry[1]),
      })),
      values: entries.map((entry) => entry[1]),
    };
  }

  protected operatorForValue(value: unknown) {
    if (Array.isArray(value)) return "IN";
    return "=";
  }

  protected joinFields(fields: string[], glue = " ") {
    const withOperators = fields.map((name) => ({ name, operator: "=" }));
    return this.joinFieldsWithOperator(withOperators, glue);
  }

  protected joinFieldsWithOperator(
    fields: { name: string; operator: string }[],
    glue = " ",
  ) {
    return fields
      .map(({ name, operator }) => `${this.escapeField(name)} ${operator} ?`)
      .join(glue);
  }

  private selectByQuery(fields: string[]) {
    const where = this.joinFields(fields, " AND ");
    return `SELECT *
                FROM ${this.table} BY ${this.idFieldName}
                WHERE ${where};`;
  }

  private insertQuery() {
    return `INSERT INTO ${this.table}
                    VALUE ?;`;
  }

  private insertIntoQuery(field: string, whereFields: string[]) {
    const where = this.joinFields(whereFields, " AND ");
    return `FROM ${this.table} AS t BY ${this.idFieldName}
            WHERE ${where} 
            INSERT INTO t.${field} VALUE ?;`;
  }

  private updateQuery(
    updateFields: string[],
    whereFields: { name: string; operator: string }[],
  ) {
    const update = this.joinFields(updateFields, ", ");
    const where = this.joinFieldsWithOperator(whereFields, " AND ");
    return `UPDATE ${this.table} BY ${this.idFieldName}
                SET ${update}
                WHERE ${where};`;
  }

  private deleteByQuery(fields: string[]) {
    const where = this.joinFields(fields, " AND ");
    return `DELETE
                FROM ${this.table} BY ${this.idFieldName}
                WHERE ${where};`;
  }

  private escapeFields(fields: string[]): string[] {
    return fields.map((f) => this.escapeField(f));
  }

  private escapeField(field: string): string {
    return field
      .split(".")
      .map((g) => `"${g}"`)
      .join(".");
  }
}
