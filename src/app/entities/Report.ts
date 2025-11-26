import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
// Attempt is not imported to avoid circular dependency
// The decorator uses a function reference which resolves at runtime

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ name: 'run_id', type: 'varchar', unique: true })
  runId!: string;

  @Column({ name: 'report_filename', type: 'text', nullable: true })
  reportFilename!: string | null;

  @Column({ name: 'garak_version', type: 'varchar', nullable: true })
  garakVersion!: string | null;

  @Column({ name: 'model_type', type: 'varchar', nullable: true })
  modelType!: string | null;

  @Column({ name: 'model_name', type: 'varchar', nullable: true })
  modelName!: string | null;

  // full config line / relevant garak config
  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config!: any | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('./Attempt').Attempt,
    (attempt: any) => attempt.report,
  )
  attempts!: any[]; // Attempt[] - using any to avoid circular import
}

