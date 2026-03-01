import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
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
  uploaderId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader?: User;

  @Expose()
  get prettyFileName(): string {
    const dashIndex = this.name.indexOf('-');
    if (dashIndex === -1) {
      return this.name;
    }
    return this.name.substring(dashIndex + 1);
  }
}
