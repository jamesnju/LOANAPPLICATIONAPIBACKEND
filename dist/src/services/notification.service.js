import { prisma } from "../config/prisma.js";
import { sendLoanNotificationEmail, } from "./email.service.js";
/*
 * Create a notification record.
 */
export async function createNotification(data) {
    return prisma.notification.create({
        data: {
            userId: data.userId,
            type: data.type,
            channel: data.channel,
            title: data.title,
            message: data.message,
            /*
             * Store additional information such as:
             *
             * loanId
             * loanNumber
             * scheduleId
             * dueDate
             */
            metadata: data.metadata
                ? JSON.parse(JSON.stringify(data.metadata))
                : undefined,
            /*
             * sentAt remains null until
             * the notification is actually delivered.
             */
            sentAt: null,
        },
    });
}
/*
 * Send an email notification to a user.
 *
 * For now, this is the notification
 * delivery channel we are using.
 */
export async function notifyUserByEmail(userId, type, title, message, metadata) {
    /*
     * Get the user's email address.
     */
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            email: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (!user.email) {
        throw new Error("User does not have an email address");
    }
    /*
     * Create the notification record first.
     */
    const notification = await createNotification({
        userId,
        type,
        channel: "EMAIL",
        title,
        message,
        metadata,
    });
    try {
        /*
         * Send using the existing
         * email.service.ts
         */
        await sendLoanNotificationEmail(user.email, title, message);
        /*
         * Email was successfully sent.
         * Record the delivery time.
         */
        const updatedNotification = await prisma.notification.update({
            where: {
                id: notification.id,
            },
            data: {
                sentAt: new Date(),
            },
        });
        return updatedNotification;
    }
    catch (error) {
        /*
         * Keep sentAt as null because
         * the email was not successfully sent.
         */
        console.error(`[NOTIFICATION] Failed to send email to ${user.email}:`, error);
        return notification;
    }
}
/*
 * General notification function.
 *
 * For now, notifyUser sends EMAIL.
 *
 * Later we can add:
 *
 * - SMS
 * - IN_APP
 * - PUSH
 */
export async function notifyUser(userId, type, title, message, metadata) {
    return notifyUserByEmail(userId, type, title, message, metadata);
}
/*
 * Get notifications belonging to
 * the currently logged-in user.
 */
export async function getMyNotifications(userId) {
    return prisma.notification.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
/*
 * Get unread notifications.
 */
export async function getUnreadNotifications(userId) {
    return prisma.notification.findMany({
        where: {
            userId,
            isRead: false,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
/*
 * Get one notification.
 */
export async function getNotificationById(userId, notificationId) {
    return prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });
}
/*
 * Mark one notification as read.
 */
export async function markNotificationAsRead(userId, notificationId) {
    return prisma.notification.updateMany({
        where: {
            id: notificationId,
            userId,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
}
/*
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(userId) {
    return prisma.notification.updateMany({
        where: {
            userId,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
}
/*
 * Delete notification.
 */
export async function deleteNotification(userId, notificationId) {
    return prisma.notification.deleteMany({
        where: {
            id: notificationId,
            userId,
        },
    });
}
// import { prisma } from "../config/prisma.js";
// import type { Role } from "../generated/prisma/enums.js";
// /*
//  * Staff roles
//  */
// const STAFF_ROLES: Role[] = [
//   "SUPER_ADMIN",
//   "ADMIN",
//   "LOAN_OFFICER",
//   "FINANCE_OFFICER",
//   "SUPPORT",
// ];
// /*
//  * Create notification
//  */
// export async function createNotification(data: {
//   userId: string;
//   type:
//     | "APPLICATION_SUBMITTED"
//     | "APPLICATION_APPROVED"
//     | "APPLICATION_REJECTED"
//     | "LOAN_DISBURSED"
//     | "REPAYMENT_DUE"
//     | "REPAYMENT_OVERDUE"
//     | "PAYMENT_RECEIVED"
//     | "GENERAL";
//   channel:
//     | "EMAIL"
//     | "SMS"
//     | "PUSH"
//     | "IN_APP";
//   title: string;
//   message: string;
//   metadata?: Record<string, any>;
// }) {
//   return prisma.notification.create({
//     data: {
//       userId: data.userId,
//       type: data.type,
//       channel: data.channel,
//       title: data.title,
//       message: data.message,
//       metadata: data.metadata,
//       sentAt: new Date(),
//     },
//   });
// }
// /*
//  * Get customer's notifications
//  */
// export async function getMyNotifications(
//   userId: string,
// ) {
//   return prisma.notification.findMany({
//     where: {
//       userId,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// }
// /*
//  * Get unread notifications
//  */
// export async function getUnreadNotifications(
//   userId: string,
// ) {
//   return prisma.notification.findMany({
//     where: {
//       userId,
//       isRead: false,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// }
// /*
//  * Get one notification
//  */
// export async function getNotificationById(
//   id: string,
//   userId: string,
// ) {
//   return prisma.notification.findFirst({
//     where: {
//       id,
//       userId,
//     },
//   });
// }
// /*
//  * Mark notification as read
//  */
// export async function markNotificationAsRead(
//   id: string,
//   userId: string,
// ) {
//   const notification =
//     await prisma.notification.findFirst({
//       where: {
//         id,
//         userId,
//       },
//     });
//   if (!notification) {
//     throw new Error("NOTIFICATION_NOT_FOUND");
//   }
//   return prisma.notification.update({
//     where: {
//       id,
//     },
//     data: {
//       isRead: true,
//       readAt: new Date(),
//     },
//   });
// }
// /*
//  * Mark all notifications as read
//  */
// export async function markAllNotificationsAsRead(
//   userId: string,
// ) {
//   return prisma.notification.updateMany({
//     where: {
//       userId,
//       isRead: false,
//     },
//     data: {
//       isRead: true,
//       readAt: new Date(),
//     },
//   });
// }
// /*
//  * Delete notification
//  */
// export async function deleteNotification(
//   id: string,
//   userId: string,
// ) {
//   const notification =
//     await prisma.notification.findFirst({
//       where: {
//         id,
//         userId,
//       },
//     });
//   if (!notification) {
//     throw new Error("NOTIFICATION_NOT_FOUND");
//   }
//   return prisma.notification.delete({
//     where: {
//       id,
//     },
//   });
// }
// /*
//  * Create notification for a user when an
//  * important loan event occurs.
//  */
// export async function notifyUser(
//   userId: string,
//   type:
//     | "APPLICATION_SUBMITTED"
//     | "APPLICATION_APPROVED"
//     | "APPLICATION_REJECTED"
//     | "LOAN_DISBURSED"
//     | "REPAYMENT_DUE"
//     | "REPAYMENT_OVERDUE"
//     | "PAYMENT_RECEIVED"
//     | "GENERAL",
//   title: string,
//   message: string,
//   metadata?: Record<string, any>,
// ) {
//   return createNotification({
//     userId,
//     type,
//     channel: "IN_APP",
//     title,
//     message,
//     metadata,
//   });
// }
//# sourceMappingURL=notification.service.js.map