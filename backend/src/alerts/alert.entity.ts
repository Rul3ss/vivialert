import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 3 })
  origin: string;

  @Column({ length: 3 })
  destination: string;

  @Column({ type: 'date' })
  departureDate: string;

  @Column({ type: 'date' })
  returnDate: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  targetPrice: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}