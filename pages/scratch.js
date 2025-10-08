import { useState, useCallback, useEffect } from "react";
import Head from "next/head";

import {
  PencilSquareIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

export default function Scratch() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedScheduleID, setSelectedScheduleID] = useState(-1);
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const hours = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23,
  ];
  const match = ["btn", "btn btn-info", "btn btn-success"];
  const [grid, setGrid] = useState(
    hours.map((h) => {
      return days.map((d) => {
        return {
          day: d,
          hour: h,
          selected: d == "We" && h == 10 ? true : false,
        };
      });
    })
  );
  const [selectedDays, setSelectedDays] = useState(["Mo", "We", "Fr", "Sa"]);
  const [selectedHours, setSelectedHours] = useState([9, 10, 11]);
  console.log(grid);

  function openModal(scheduleID) {
    console.log("Open Modal: ", scheduleID);
    filterSchedules(scheduleID);
    setModalIsOpen(true);
  }
  
  function closeModal() {
    setModalIsOpen(false);
  }
  
  function filterSchedules(scheduleID) {
    setSelectedScheduleID(scheduleID);
  }
  const hasSelections = function (day, hour) {
    const hasDay = selectedDays.includes(day) == true ? 1 : 0;
    const hasHour = selectedHours.includes(hour) == true ? 1 : 0;
    return hasDay + hasHour;
  };

  const updateDays = function (day) {
    console.log("in Update Days:", day);
    if (selectedDays.includes(day) == true) {
      console.log("tring to remove day: ", day);
      setSelectedDays((selectedDays) => {
        return selectedDays.filter((sd) => sd != day);
      });
    } else {
      setSelectedDays((selectedDays) => {
        return [...selectedDays, day];
      });
    }
  };

  const updateHours = function (hour) {
    console.log("in Update Hours:", hour);
    if (selectedHours.includes(hour) == true) {
      console.log("tring to remove hour: ", hour);
      setSelectedHours((selectedHours) => {
        return selectedHours.filter((sh) => sh != hour);
      });
    } else {
      setSelectedHours((selectedHours) => {
        return [...selectedHours, hour];
      });
    }
  };

  return (
    <>
      <Head>
        <title>Scratch Pad</title>
      </Head>
      
      <div className="flex flex-col mx-10 mt-4">
        <h1 className="text-3xl font-bold underline text-center">
          Scratch Pad
        </h1>
      </div>
      
      <div className="divider"></div>

      {/* <table className="table table-compact bg-slate-100 text-center">
        <thead>
          <tr>
            <th>Day/Hour</th>
            {days.map((day) => {
              return (
                <th key={day}>
                  <span
                    className={`btn btn-sm btn-outline' ${
                      selectedDays.includes(day) == true
                        ? "btn-info"
                        : "btn-primary"
                    }`}
                    onClick={(e) => updateDays(day)}
                  >
                    {day}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grid.map((grd) => {
            return (
              <tr key={grd[0].hour}>
                <td
                  className={`btn btn-sm text-red-500 bg-slate-300' ${
                    selectedHours.includes(grd[0].hour) == true
                      ? "btn-info"
                      : "btn-primary"
                  }`}
                  onClick={(e) => updateHours(grd[0].hour)}
                >
                  {grd[0].hour}
                </td>
                {grd.map((g) => {
                  return (
                    <td key={g.day}>
                      <span
                        className={`btn-sm ${
                          match[hasSelections(g.day, grd[0].hour)]
                        }`}
                      >
                        {g.selected ? `X` : `_`}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table> */}

      <div>after grid</div>
    </>
  );
}
