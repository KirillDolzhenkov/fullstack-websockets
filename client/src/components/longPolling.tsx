import React, { ChangeEvent, useEffect, useState } from "react";
import axios from "axios";

interface iMessages {
    id: number;
    message: string;
}

type Messages = iMessages[];

const RETRY_DELAY = 500;

export const LongPolling = () => {
    const [messages, setMessages] = useState<Messages>([]);
    const [messageValue, setMessageValue] = useState<string>("");

    useEffect(() => {
        // Флаг для отслеживания состояния подписки (активна или нет)
        // и предотвращения обновления состояния после размонтирования компонента
        let isSubscribed = true;

        // Запускаем long polling
        subscribe(isSubscribed);

        return () => {
            isSubscribed = false;  // Отписываемся при размонтировании компонента
        };
    }, []);

    const subscribe = async (isSubscribed: boolean) => {
        try {
            if(!isSubscribed) return

            // Загружаем сообщения
            const {data} = await axios.get('http://localhost:5000/get-messages', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            })

            // Фильтруем дубликаты сообщений
            setMessages(prev => (
                prev.some(msg => msg.id === data.id) ? prev : [data, ...prev]
            ));

            await subscribe(isSubscribed) // Рекурсивный вызов для продолжения long polling
        } catch (error) {
            console.error("Failed to load messages", error);
            retry(() => subscribe(isSubscribed)) // Повторить попытку через 500 мс, если подписка всё ещё активна
        }
    };

    const retry = (callback: () => void) => {
        setTimeout(callback, RETRY_DELAY);  // Задержка для ретраев
    };

    const onMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
        setMessageValue(e.target.value);
    };

    const onEnterPressed = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onSentMessage();
        }
    };

    const onSentMessage = async () => {
        if (!messageValue) return;

        const newMessage = {
            message: messageValue,
            id: Date.now(),
        };

        try {
            await axios.post("http://localhost:5000/new-messages", newMessage);
            setMessageValue(""); // Очищаем input после отправки
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    return (
        <div className="center">
            <div>
                <div className="form">
                    <input
                        type="text"
                        value={messageValue}
                        onChange={onMessageChange}
                        onKeyDown={onEnterPressed}
                    />
                    <button onClick={onSentMessage}>Send</button>
                </div>
                <div className="messages">
                    {messages.map((msg) => (
                        <div className="message" key={msg.id}>
                            {msg.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
