import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Guarda a posição do rodízio das chaves da SerpApi, para que ela sobreviva a
 * reinícios da API (o Fly desliga a máquina entre um ciclo e outro).
 */
export class AddSerpApiKeyRotation1793200000000 implements MigrationInterface {
    name = 'AddSerpApiKeyRotation1793200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "serpapi_key_rotation" ("id" smallint NOT NULL PRIMARY KEY, "counter" bigint NOT NULL)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "serpapi_key_rotation"`);
    }

}
