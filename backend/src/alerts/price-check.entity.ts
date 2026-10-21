import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Alert } from './alert.entity';

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

  @CreateDateColumn()
  checkedAt: Date;
}