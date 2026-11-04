import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Aposenta a janela de datas: o alerta passa a ter **data de ida e data de
 * volta exatas**, como o Google Flights.
 *
 * - `departureFrom`/`departureTo`/`durationDays` viram `departureDate`/`returnDate`;
 * - `lastNotifiedDepartureDate` sai: sem janela, o dia avisado é sempre a ida.
 *
 * Alertas existentes são convertidos pela ida de início da janela e pela
 * duração, que é a mesma viagem que o alerta já monitorava.
 */
export class RetireDateWindow1793100000000 implements MigrationInterface {
    name = 'RetireDateWindow1793100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureDate" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "returnDate" date`);

        await queryRunner.query(`UPDATE "alerts" SET "departureDate" = "departureFrom"`);
        await queryRunner.query(
            `UPDATE "alerts" SET "returnDate" = "departureFrom" + "durationDays"`,
        );

        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureDate" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "returnDate" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureFrom"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureTo"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "durationDays"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastNotifiedDepartureDate"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureFrom" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "departureTo" date`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "durationDays" smallint`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastNotifiedDepartureDate" date`);

        await queryRunner.query(`UPDATE "alerts" SET "departureFrom" = "departureDate"`);
        await queryRunner.query(`UPDATE "alerts" SET "departureTo" = "departureDate"`);
        await queryRunner.query(
            `UPDATE "alerts" SET "durationDays" = GREATEST(("returnDate" - "departureDate")::int, 1)`,
        );
        await queryRunner.query(
            `UPDATE "alerts" SET "lastNotifiedDepartureDate" = "departureDate"`,
        );

        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureFrom" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "departureTo" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "durationDays" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "departureDate"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "returnDate"`);
    }

}
