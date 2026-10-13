"use strict";

const analogClock = document.getElementById("analogClock");
const clockNumbers = document.getElementById("clockNumbers");
const clockMarks = document.getElementById("clockMarks");

const hourHand = document.getElementById("hourHand");
const minuteHand = document.getElementById("minuteHand");
const secondHand = document.getElementById("secondHand");


function createClockNumbers() {
    for (let i = 1; i <= 12; i++) {
        const number = document.createElement("div");
        number.className = "clock-number";
        number.textContent = i;

        const angle = (i * 30 - 90) * Math.PI / 180;

        const radius = 34;

        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);

        number.style.left = `${x}%`;
        number.style.top = `${y}%`;

        clockNumbers.appendChild(number);
    }
}


function createClockMarks() {
    for (let i = 0; i < 60; i++) {
        const mark = document.createElement("div");

        const major = i % 5 === 0;

        mark.className = major
            ? "clock-mark major"
            : "clock-mark";

        const angle = i * 6;

        const radius = major ? 75 : 79;

        mark.style.transform =
            `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`;

        clockMarks.appendChild(mark);
    }
}


function updateClock() {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23"
    }).formatToParts(now);

    const values = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = Number(part.value);
        }
    }

    const hours = values.hour;
    const minutes = values.minute;
    const seconds = values.second;

    const hourAngle =
        (hours % 12) * 30 + minutes * 0.5;

    const minuteAngle =
        minutes * 6 + seconds * 0.1;

    const secondAngle =
        seconds * 6;

    hourHand.style.transform =
        `rotate(${hourAngle}deg)`;

    minuteHand.style.transform =
        `rotate(${minuteAngle}deg)`;

    secondHand.style.transform =
        `rotate(${secondAngle}deg)`;
}


createClockNumbers();
createClockMarks();
updateClock();

setInterval(updateClock, 1000);
