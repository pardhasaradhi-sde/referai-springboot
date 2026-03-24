"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { getToken } from "@/lib/api/client";
import { createStompClient, subscribeToNotifications } from "@/lib/websocket";
import { Client } from "@stomp/stompjs";
import { useRouter } from "next/navigation";

export interface NotificationDto {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const stompClientRef = useRef<Client | null>(null);
    const router = useRouter();

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        const token = getToken();
        if (token) {
            const client = createStompClient(token);
            stompClientRef.current = client;

            client.onConnect = () => {
                subscribeToNotifications(client, (msg: unknown) => {
                    const typedMsg = msg as NotificationDto;
                    setNotifications((prev) => [typedMsg, ...prev]);
                });
            };

            client.activate();
        }

        return () => {
            stompClientRef.current?.deactivate();
        };
    }, []);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const handleNotificationClick = (notification: NotificationDto) => {
        markAsRead(notification.id);
        setIsOpen(false);
        if (notification.type === "NEW_REQUEST" || notification.type === "REQUEST_ACCEPTED" || notification.type === "REQUEST_DECLINED") {
            router.push("/dashboard/requests");
        } else if (notification.type === "NEW_MESSAGE") {
            router.push("/dashboard/requests"); // Navigate to requests where they can see active chats
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 md:left-full md:right-auto md:ml-2 bottom-full mb-2 md:bottom-auto md:top-0 md:mt-0 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[100]">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                            <div>
                                                <p className="text-[13px] font-bold text-gray-900 mb-0.5">{n.title}</p>
                                                <p className="text-[12px] text-gray-600 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] font-medium text-gray-400 mt-2 uppercase tracking-wide">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
