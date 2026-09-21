import React, { useCallback, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  pilotIntakeByService,
  pilotServiceById,
  type IntakeAnswer,
} from "@pro-now/types";
import {
  DescribeFaultBody,
  catalogHomeServices,
  catalogServicePages,
  customerDarkTheme,
  photoPromptFor,
} from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { useCapture } from "../capture/useCapture";

type Props = NativeStackScreenProps<CustomerStackParamList, "RequestDetails">;

/**
 * C06 — telling us what happened.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SCREEN USED TO BE
 * ---------------------------------------------------------------------
 * A title, a text box, two buttons with emoji on them that did nothing at
 * all — `📷 צלם תמונה` and `🎙️ תאר בקול` had no handlers — and a green
 * card reading "דמי ביקור החל מ־₪179", written into the component for
 * every service in the catalogue. A massage and a tow truck both quoted
 * ₪179. The address sent with the request was the literal string
 * `"demo-address"`.
 *
 * A price beside a service definition gets read as a promise, and the only
 * system allowed to make that promise is the pricing engine on the server
 * — which is why the catalogue says HOW a service is priced and never how
 * much. The hard-coded number is gone; the service's own pricing model is
 * what the screen explains.
 *
 * ---------------------------------------------------------------------
 * THE BUTTONS WORK NOW, AND THEY ARE DIFFERENT BUTTONS
 * ---------------------------------------------------------------------
 * Amit: *"גלריה ומצלמה — שניהם פותחים מצלמה"*, then *"שלוחצים גלריה שלא
 * יפתח גם מצלמה, רק גלריה"*, then *"ההקלטה לא עובדת, מה זה ההרשאות האלה"*.
 * All three are the same complaint: a control that mimes its function.
 * `useCapture` is the real camera, the real library and the real
 * microphone, and a permission that comes back "no" produces a sentence
 * instead of a dim circle.
 *
 * ---------------------------------------------------------------------
 * AND THE QUESTIONS THIS SERVICE ASKS
 * ---------------------------------------------------------------------
 * `pilotIntakeByService` holds the intake per service, so a blocked drain
 * is asked where the water is standing and a personal trainer is not. A
 * service with no intake gets no questions rather than generic ones — the
 * screen is then exactly what it was, which is the point: a service
 * without a good set of questions must not be given a bad one.
 */
export function RequestDetailsScreen({ route, navigation }: Props) {
  const { serviceId, serviceName, describedHe } = route.params;
  const { width, height } = useWindowDimensions();

  const page = catalogServicePages[serviceId];
  const service = pilotServiceById[serviceId];
  const mark = useMemo(
    () => catalogHomeServices.find((s) => s.id === serviceId)?.mark ?? "plumbing",
    [serviceId]
  );

  const capture = useCapture(service?.photoSubjectHe ?? "");
  const [text, setText] = useState(describedHe ?? "");
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);

  const onAnswer = useCallback((a: IntakeAnswer) => {
    // Last answer per question wins; a question is answered once.
    setAnswers((prev) => [...prev.filter((p) => p.questionId !== a.questionId), a]);
  }, []);

  /*
   * The fault, then the door. The job is created on the address screen
   * because `POST /v1/jobs` needs a real `addressId` that belongs to this
   * customer — the old code sent the literal string "demo-address", which
   * worked against a seeded development database and nowhere else.
   */
  const onSend = useCallback(() => {
    navigation.navigate("Address", {
      serviceId,
      serviceName: page?.nameHe ?? serviceName,
      describedHe: text,
      /*
       * THE ANSWERS TRAVEL, BECAUSE THE WHOLE POINT IS THAT THEY DO.
       *
       * This screen asks what the service needs to know — where the water
       * is standing, which floor, whether the power is out in the whole
       * flat — and then handed the next screen a sentence and dropped
       * them. The professional arrived knowing nothing the customer had
       * taken the trouble to say.
       */
      intakeAnswers: answers,
    });
  }, [navigation, serviceId, serviceName, page, text, answers]);

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <DescribeFaultBody
        serviceNameHe={page?.nameHe ?? serviceName}
        mark={mark}
        /*
         * Symptoms are chosen on the service page and shown back here for
         * confirmation. Nothing has chosen any yet on this path, so the
         * list is empty rather than pre-ticked with a guess.
         */
        symptomsHe={[]}
        photoPromptHe={photoPromptFor(serviceId)}
        intake={pilotIntakeByService[serviceId]}
        answers={answers}
        onAnswer={onAnswer}
        text={text}
        onChangeText={setText}
        photos={capture.photos}
        onAddPhoto={capture.addPhoto}
        onAddFromLibrary={capture.addFromLibrary}
        onRemovePhoto={capture.removePhoto}
        voice={capture.voice}
        recording={capture.recording}
        recordSeconds={capture.recordSeconds}
        canRecord={capture.canRecord}
        recordBlockedHe={capture.recordBlockedHe}
        onStartRecord={capture.startRecord}
        onStopRecord={capture.stopRecord}
        onDeleteVoice={capture.deleteVoice}
        onSend={onSend}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
