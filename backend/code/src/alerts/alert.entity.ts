import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { PriceResult } from './price-evaluation';

/**
 * O sistema aceita **um único alerta** (o da amiga).
 *
 * A restrição vem da API de preço: cada checagem custa cota. Um alerta por
 * instância é o que cabe no plano e é exatamente o caso de uso. A regra é
 * garantida no banco por um índice único em `"singleton"` (ver migration):
 * duas requisições simultâneas não conseguem criar dois alertas.
 */
@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Sempre `true`; existe para o índice único garantir 1 alerta. */
  @Column({ type: 'boolean', default: true, select: false })
  singleton: boolean;

  @Column({ length: 3 })
  origin: string;

  @Column({ length: 3 })
  destination: string;

  /** Data de ida, `AAAA-MM-DD`. */
  @Column({ type: 'date' })
  departureDate: string;

  /** Data de volta, `AAAA-MM-DD`. */
  @Column({ type: 'date' })
  returnDate: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  targetPrice: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  lastNotifiedPrice: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  lastNotifiedLevel: PriceResult | null;

  @Column({ type: 'timestamp', nullable: true })
  lastNotifiedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date | null;

  /** Último erro do vigia (provedor fora, cota estourada...). `null` = tudo certo. */
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  /** Erros seguidos: usados para espaçar as tentativas (backoff). */
  @Column({ type: 'smallint', default: 0 })
  consecutiveFailures: number;

  @CreateDateColumn()
  createdAt: Date;
}
