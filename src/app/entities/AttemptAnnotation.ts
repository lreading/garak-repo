import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Attempt } from './Attempt';

@Entity({ name: 'attempt_annotations' })
export class AttemptAnnotation {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'attempt_id', unique: true })
  attemptId!: number;

  @OneToOne(() => Attempt, (attempt) => attempt.annotation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: Attempt;

  @Column({ name: 'is_false_positive', type: 'boolean', default: false })
  isFalsePositive!: boolean;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

