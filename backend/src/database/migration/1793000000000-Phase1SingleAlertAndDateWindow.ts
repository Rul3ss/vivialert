import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fase 1:
 * - um único alerta (índice único em `singleton`);
 * - janela de datas (`departureFrom`/`departureTo`/`durationDays`) no lugar do
 *   par exato de datas;
 * - estado do vigia em `alerts` (`lastError`, `consecutiveFailures`);
 * - `price_checks` passa a guardar o par de datas encontrado e se houve oferta.
 */
export class Phase1SingleAlertAndDateWindow1793000000000 implements MigrationInterface {
    name = 'Phase1SingleAlertAndDateWindow1793000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // -- alerts: janela de datas -------------------------------------------
        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureFrom" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureTo" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "durationDays" smallint`);

        // Alerta antigo (par exato) vira janela de 1 dia; a duração é calculada.
        await queryRunner.query(`UPDATE "alerts" SET "departureFrom" = "departureDate"`);
        await queryRunner.query(`UPDATE "alerts" SET "departureTo" = "departureDate"`);
        await queryRunner.query(
            `UPDATE "alerts" SET "durationDays" = GREATEST(("returnDate" - "departureDate")::int, 1)`,
        );

        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureFrom" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureTo" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "durationDays" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureDate"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "returnDate"`);

        // -- alerts: estado do último aviso e do vigia -------------------------
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastNotifiedDepartureDate" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastError" text`);
        await queryRunner.query(
            `ALTER TABLE "alerts" ADD "consecutiveFailures" smallint NOT NULL DEFAULT 0`,
        );

        // -- alerta único ------------------------------------------------------
        // Se já existirem vários alertas, a migration não pode simplesmente
        // apagar os dados de ninguém: mantém o mais recente e desativa os demais.
        await queryRunner.query(`
            UPDATE "alerts" SET "active" = false
            WHERE "id" <> (
                SELECT "id" FROM "alerts" ORDER BY "createdAt" DESC LIMIT 1
            )
        `);
        await queryRunner.query(`DELETE FROM "alerts" WHERE "active" = false`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "singleton" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "UQ_alerts_singleton" ON "alerts" ("singleton")`,
        );

        // -- price_checks: quais datas responderam + houve oferta? -------------
        await queryRunner.query(`ALTER TABLE "price_checks" ADD "departureDate" date`);
        await queryRunner.query(`ALTER TABLE "price_checks" ADD "returnDate" date`);
        await queryRunner.query(`ALTER TABLE "price_checks" ADD "airline" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "price_checks" ADD "source" character varying(32)`);
        await queryRunner.query(
            `ALTER TABLE "price_checks" ADD "found" boolean NOT NULL DEFAULT true`,
        );

        // -- índices para o vigia e o histórico --------------------------------
        await queryRunner.query(
            `CREATE INDEX "IDX_price_checks_alert_checkedAt" ON "price_checks" ("alertId", "checkedAt" DESC)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_price_checks_alert_checkedAt"`);
        await queryRunner.query(`ALTER TABLE "price_checks" DROP COLUMN "found"`);
        await queryRunner.query(`ALTER TABLE "price_checks" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "price_checks" DROP COLUMN "airline"`);
        await queryRunner.query(`ALTER TABLE "price_checks" DROP COLUMN "returnDate"`);
        await queryRunner.query(`ALTER TABLE "price_checks" DROP COLUMN "departureDate"`);

        await queryRunner.query(`DROP INDEX "UQ_alerts_singleton"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "singleton"`);

        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "consecutiveFailures"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastError"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastNotifiedDepartureDate"`);

        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureDate" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "returnDate" date`);
        await queryRunner.query(`UPDATE "alerts" SET "departureDate" = "departureFrom"`);
        await queryRunner.query(
            `UPDATE "alerts" SET "returnDate" = "departureFrom" + "durationDays"`,
        );
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureDate" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "returnDate" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "durationDays"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureTo"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureFrom"`);
    }

}
