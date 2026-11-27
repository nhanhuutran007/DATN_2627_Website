import { SchedulerLockService } from "./scheduler-lock.service";

/** Thời hạn khóa theo chu kỳ cron: ngắn hơn chu kỳ một chút để lượt sau luôn giành lại được. */
export const JOB_LEASE = {
  EVERY_10_MINUTES: 9 * 60,
  EVERY_HOUR: 55 * 60,
  EVERY_6_HOURS: 5 * 60 * 60 + 50 * 60,
  EVERY_DAY: 23 * 60 * 60,
} as const;

type AsyncJob = (...args: never[]) => Promise<unknown>;

/**
 * Chỉ một instance backend chạy job trong mỗi lượt (xem `SchedulerLockService`). Đặt **dưới** `@Cron`;
 * metadata của các decorator khác vẫn được chép sang hàm bọc nên thứ tự đặt sai cũng không mất lịch.
 * Khi không có Nest (unit test gọi thẳng phương thức) thì chạy như bình thường.
 */
export function ExclusiveJob(name: string, leaseSeconds: number): MethodDecorator {
  return (_target, _key, descriptor) => {
    const original = descriptor.value as unknown as AsyncJob;
    const wrapped = async function (this: unknown, ...args: never[]): Promise<unknown> {
      const lock = SchedulerLockService.current();
      if (lock && !(await lock.tryAcquire(name, leaseSeconds))) return undefined;
      return original.apply(this, args);
    };
    for (const key of Reflect.getMetadataKeys(original)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, original), wrapped);
    }
    Object.defineProperty(wrapped, "name", { value: original.name });
    (descriptor as TypedPropertyDescriptor<unknown>).value = wrapped;
    return descriptor;
  };
}
