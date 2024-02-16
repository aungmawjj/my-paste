import { useCallback, useEffect } from "react";
import { Box, Hide, Icon, IconButton, Text } from "@chakra-ui/react";
import { MdAdd, MdContentCopy } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { StreamEvent } from "./model";
import { atom, useRecoilCallback, useRecoilState } from "recoil";
import axios from "axios";

async function sleep(ms: number) {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, ms);
  });
}

const streamEventAtom = atom<{ streamEvents: StreamEvent[]; lastId: string }>({
  key: "StreamEventState",
  default: { streamEvents: [], lastId: "" },
});

function Pastes() {
  const [{ streamEvents }, setStreamEventState] =
    useRecoilState(streamEventAtom);
  const navigate = useNavigate();

  const fetchStreamEvents = useRecoilCallback(
    ({ snapshot }) =>
      async (signal: AbortSignal) => {
        const { lastId } = await snapshot.getPromise(streamEventAtom);
        const resp = await axios.get<StreamEvent[]>("/api/event", {
          signal: signal,
          params: { lastId: lastId },
        });
        if (resp.data.length == 0) return;
        resp.data.reverse();
        setStreamEventState((prev) => ({
          streamEvents: [...resp.data, ...prev.streamEvents],
          lastId: resp.data[0].Id,
        }));
      },
    []
  );

  const pollStreamEvents = useCallback(
    async (signal: AbortSignal) => {
      let errDelay = 5000;
      while (!signal.aborted) {
        try {
          await fetchStreamEvents(signal);
          errDelay = 5000;
        } catch (err) {
          console.warn("failed to fatch events: ", err);
          if (signal.aborted) break;
          console.debug(`next attampt in: ${Math.round(errDelay / 1000)}s`);
          await sleep(errDelay);
          errDelay *= 2;
        }
      }
    },
    [fetchStreamEvents]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    pollStreamEvents(ctrl.signal).catch(console.error);
    return () => {
      ctrl.abort();
    };
  }, [pollStreamEvents]);

  const onCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  return (
    <>
      <Hide above="md">
        <IconButton
          position="fixed"
          bottom={6}
          right={6}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="56px"
          height="56px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Hide>

      <Box pb={20}>
        {streamEvents.map((e) => (
          <Box
            position="relative"
            key={e.Id}
            py={6}
            px={8}
            my={4}
            border="1px"
            borderColor="gray.200"
            borderRadius="24px"
          >
            <Text fontSize="xs" color="gray">
              {new Date(e.Timestamp * 1000).toLocaleString()}
            </Text>

            <Text pt={2} fontSize="sm">
              {e.Payload}
            </Text>

            <IconButton
              position="absolute"
              top={1}
              right={4}
              aria-label="copy"
              variant="ghost"
              size="md"
              onClick={() => onCopy(e.Payload)}
              icon={<Icon color="gray.900" as={MdContentCopy} boxSize={6} />}
            />
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Pastes;
