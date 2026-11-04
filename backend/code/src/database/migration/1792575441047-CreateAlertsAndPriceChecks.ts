import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAlertsAndPriceChecks1792575441047 implements MigrationInterface {
    name = 'CreateAlertsAndPriceChecks1792575441047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "origin" character varying(3) NOT NULL, "destination" character varying(3) NOT NULL, "departureDate" date NOT NULL, "returnDate" date NOT NULL, "targetPrice" numeric(10,2) NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "price_checks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "price" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'BRL', "checkedAt" TIMESTAMP NOT NULL DEFAULT now(), "alertId" uuid, CONSTRAINT "PK_06d0c158e0c6a06cafc19270692" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "price_checks" ADD CONSTRAINT "FK_708e3940d9448eef0676fc796f7" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "price_checks" DROP CONSTRAINT "FK_708e3940d9448eef0676fc796f7"`);
        await queryRunner.query(`DROP TABLE "price_checks"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
    }

}
