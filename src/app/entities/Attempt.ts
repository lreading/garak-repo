import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Report } from './Report';
// AttemptAnnotation is not imported to avoid circular dependency
// The decorator uses a function reference which resolves at runtime

@Entity({ name: 'attempts' })
@Index(['reportId', 'seq'])
@Index(['reportId', 'status'])
@Index(['reportId', 'status', 'seq'])
export class Attempt {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'report_id' })
  reportId!: number;

  @ManyToOne(() => Report, (report) => report.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report!: Report;

  @Column({ name: 'uuid', type: 'uuid' })
  uuid!: string;

  @Column({ name: 'seq', type: 'int' })
  seq!: number;

  // 0 = new, 1 = started, 2 = complete
  @Column({ name: 'status', type: 'int' })
  status!: number;

  @Column({ name: 'probe_classname', type: 'varchar', nullable: true })
  probeClassname!: string | null;

  @Column({ name: 'goal', type: 'text', nullable: true })
  goal!: string | null;

  @Column({ name: 'prompt', type: 'jsonb', nullable: true })
  prompt!: any | null;

  @Column({ name: 'outputs', type: 'jsonb', nullable: true })
  outputs!: any | null;

  @Column({ name: 'detector_results', type: 'jsonb', nullable: true })
  detectorResults!: any | null;

  @Column({ name: 'notes', type: 'jsonb', nullable: true })
  notes!: any | null;

  @Column({ name: 'conversations', type: 'jsonb', nullable: true })
  conversations!: any | null;

  @Column({
    name: 'reverse_translation_outputs',
    type: 'jsonb',
    nullable: true,
  })
  reverseTranslationOutputs!: any | null;

  @Column({
    name: 'probe_params',
    type: 'jsonb',
    nullable: false,
    default: () => `'{}'`,
  })
  probeParams!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('./AttemptAnnotation').AttemptAnnotation,
    (annotation: any) => annotation.attempt,
    { cascade: true },
  )
  annotation!: any; // AttemptAnnotation - using any to avoid circular import
}

