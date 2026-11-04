import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Alert } from './alert.entity';

/**
 * Uma linha por consulta de preço. Guarda **qual par de datas** respondeu,
 * porque com janela o preço encontrado pode não ser o do início da janela.
 */
@Entity('price_checks')
export class PriceCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Alert, { onDelete: 'CASCADE' })
  alert: Alert;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: string;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ type: 'date', nullable: true })
  departureDate: string | null;

  @Column({ type: 'date', nullable: true })
  returnDate: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  airline: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  source: string | null;

  /** `null` significa "sem oferta" — nunca preço zero. */
  @Column({ type: 'boolean', default: false })
  found: boolean;

  @CreateDateColumn()
  checkedAt: Date;
}
