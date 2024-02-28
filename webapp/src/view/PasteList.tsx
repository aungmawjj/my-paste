import { Box, Show, Icon, IconButton } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useStreamState } from "../state/stream";
import PasteItem from "./PasteItem";

function PasteList() {
  const { pastes, isLoadingCache, streamService } = useStreamState();
  const navigate = useNavigate();

  return isLoadingCache ? (
    <Box pt={40} textAlign="center">
      Loading...
    </Box>
  ) : (
    <>
      <Show below="md">
        <IconButton
          position="fixed"
          bottom={8}
          right={8}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="64px"
          height="64px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Show>

      <Box pt={6} pb={28} data-testid="paste-list">
        {pastes.map((p) => (
          <PasteItem paste={p} onDelete={streamService.deleteStreamEvents} key={p.Id} />
        ))}
      </Box>
    </>
  );
}

export default PasteList;
