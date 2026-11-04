import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationStateToAlerts1792621368691 implements MigrationInterface {
    name = 'AddNotificationStateToAlerts1792621368691'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastNotifiedPrice" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastNotifiedLevel" character varying(12)`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastNotifiedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "lastCheckedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastCheckedAt"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastNotifiedAt"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastNotifiedLevel"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "lastNotifiedPrice"`);
    }

}
