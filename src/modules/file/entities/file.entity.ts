import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'files' })
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  path: string;

  @Column()
  name: string;

  @Column({ length: 100 })
  extension: string;

  @Column()
  size: number;

  @Column({ length: 100 })
  mimetype: string;

  @Column({ name: 'uploader_id', nullable: false })
  uploaderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  readonly uploader?: Readonly<User>;
}
